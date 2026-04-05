<?php

namespace App\Services;

use App\Models\Immunization;
use App\Models\ReminderMessageTemplate;
use App\Models\ReminderSetting;
use App\Models\ScheduledReminder;
use App\Models\VaccineDoseInterval;
use Carbon\Carbon;

class ImmunizationFollowupService
{
    public const DEFAULT_INTERVAL_DAYS = 30;

    public function applyNextDueFromRules(Immunization $imm): void
    {
        if ($imm->outcome !== 'administered') {
            $imm->next_due_date = null;
            $imm->followup_scheduled = false;

            return;
        }

        $dose = (int) ($imm->dose_number ?? 0);
        $total = (int) ($imm->total_doses_required ?? 0);

        if ($total > 0 && $dose >= $total) {
            $imm->next_due_date = null;
            $imm->followup_scheduled = false;

            return;
        }

        if (! $imm->date_administered) {
            return;
        }

        $days = VaccineDoseInterval::query()
            ->where('vaccine_id', $imm->vaccine_id)
            ->where('after_dose', $dose)
            ->value('interval_days');

        if ($days === null) {
            $days = self::DEFAULT_INTERVAL_DAYS;
        }

        $imm->next_due_date = Carbon::parse($imm->date_administered)->addDays((int) $days);
        $imm->followup_scheduled = true;
    }

    /**
     * Replaces pending SMS reminders for this patient/vaccine with a cascade (e.g. 10, 5, 1 days before dose due).
     */
    public function syncSmsReminder(Immunization $imm): void
    {
        ScheduledReminder::query()
            ->where('vaccinee_id', $imm->vaccinee_id)
            ->where('vaccine_id', $imm->vaccine_id)
            ->where('channel', 'sms')
            ->where('status', 'pending')
            ->update(['status' => 'superseded']);

        if ($imm->outcome !== 'administered' || ! $imm->followup_scheduled || ! $imm->next_due_date) {
            return;
        }

        $imm->loadMissing(['vaccinee', 'vaccine', 'facility']);

        $offsets = $this->resolveOffsets((int) $imm->facility_id);
        $templateModel = ReminderMessageTemplate::query()
            ->where('facility_id', $imm->facility_id)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first()
            ?? ReminderMessageTemplate::query()
                ->whereNull('facility_id')
                ->where('is_active', true)
                ->orderBy('id')
                ->first();

        $bodyTemplate = $templateModel?->body_template
            ?? '[{reminder_ordinal}] {offset_days} days before due: Hello {patient_name}, your {vaccine_name} dose is due on {dose_due_date}. {facility_name}.';

        $vaccinee = $imm->vaccinee;
        $patientLabel = $vaccinee !== null
            ? trim(implode(' ', array_filter([
                $vaccinee->first_name,
                $vaccinee->last_name,
            ]))) ?: (string) $vaccinee->name
            : 'Patient';

        $vaccineLabel = $imm->vaccine?->name ?? 'vaccine';
        $facilityName = $imm->facility?->name ?? 'your clinic';
        $anchor = Carbon::parse($imm->next_due_date)->startOfDay();
        $doseDueStr = $anchor->format('Y-m-d');
        $today = Carbon::today();

        $sequence = 0;
        foreach ($offsets as $daysBefore) {
            $sequence++;
            $dueAt = (clone $anchor)->subDays((int) $daysBefore)->startOfDay();
            if ($dueAt->lt($today)) {
                continue;
            }

            $vars = [
                'patient_name' => $patientLabel,
                'vaccine_name' => $vaccineLabel,
                'dose_due_date' => $doseDueStr,
                'facility_name' => $facilityName,
                'offset_days' => (string) $daysBefore,
                'reminder_sequence' => (string) $sequence,
                'reminder_ordinal' => ReminderMessageRenderer::ordinal($sequence),
            ];

            $message = ReminderMessageRenderer::render($bodyTemplate, $vars);

            ScheduledReminder::create([
                'facility_id' => $imm->facility_id,
                'vaccinee_id' => $imm->vaccinee_id,
                'vaccine_id' => $imm->vaccine_id,
                'immunization_id' => $imm->id,
                'due_at' => $dueAt,
                'channel' => 'sms',
                'status' => 'pending',
                'message' => $message,
                'sequence' => $sequence,
                'days_before_due' => (int) $daysBefore,
                'dose_due_on' => $anchor->toDateString(),
            ]);
        }
    }

    /**
     * @return int[]
     */
    protected function resolveOffsets(int $facilityId): array
    {
        $specific = ReminderSetting::query()->where('facility_id', $facilityId)->first();
        if ($specific !== null && is_array($specific->offset_days) && count($specific->offset_days) > 0) {
            return array_values(array_map('intval', $specific->offset_days));
        }

        $global = ReminderSetting::query()->whereNull('facility_id')->first();
        if ($global !== null && is_array($global->offset_days) && count($global->offset_days) > 0) {
            return array_values(array_map('intval', $global->offset_days));
        }

        return [10, 5, 1];
    }
}
