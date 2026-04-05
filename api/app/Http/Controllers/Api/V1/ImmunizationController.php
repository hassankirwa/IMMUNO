<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Concerns\AppliesFacilityScope;
use App\Http\Controllers\Controller;
use App\Models\AdministrationRoute;
use App\Models\FacilityVaccineInventory;
use App\Models\Immunization;
use App\Models\Vaccinee;
use App\Services\ImmunizationFollowupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ImmunizationController extends Controller
{
    use AppliesFacilityScope;

    public function __construct(
        protected ImmunizationFollowupService $followupService
    ) {}

    /**
     * Resolve a route from explicit id and/or legacy string code/name.
     */
    protected function resolveAdministrationRouteId(?int $id, ?string $routeCode): ?int
    {
        if ($id !== null) {
            return $id;
        }
        if ($routeCode === null || trim($routeCode) === '') {
            return null;
        }
        $lower = strtolower(trim($routeCode));
        $route = AdministrationRoute::query()
            ->whereRaw('LOWER(code) = ?', [$lower])
            ->orWhereRaw('LOWER(name) = ?', [$lower])
            ->first();
        if ($route !== null) {
            return (int) $route->id;
        }
        $aliases = [
            'subcutaneous' => 'sc',
            'intradermal' => 'id',
            'intramuscular' => 'im',
        ];
        if (isset($aliases[$lower])) {
            $match = AdministrationRoute::query()
                ->whereRaw('LOWER(code) = ?', [$aliases[$lower]])
                ->first();

            return $match !== null ? (int) $match->id : null;
        }

        return null;
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Immunization::class);

        $limit = min(500, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));
        $search = trim((string) $request->query('search', ''));

        $query = Immunization::query()
            ->with(['vaccinee', 'vaccine', 'facility', 'administrator', 'administrationRoute', 'facilityVaccineInventory'])
            ->orderByDesc('date_administered')
            ->orderByDesc('id');

        $query = $this->scopeByFacility($query, $request->user());

        if ($request->user()->hasRole('health_officer') && ! $request->user()->hasRole('admin')) {
            $query->where('administered_by', $request->user()->id);
        }

        if ($request->user()->hasRole('admin') && $request->filled('facility_id')) {
            $query->where('facility_id', (int) $request->query('facility_id'));
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('batch_number', 'like', $like)
                    ->orWhere('notes', 'like', $like)
                    ->orWhere('status', 'like', $like)
                    ->orWhereHas('vaccinee', function ($vq) use ($like) {
                        $vq->where('name', 'like', $like);
                    })
                    ->orWhereHas('vaccine', function ($vq) use ($like) {
                        $vq->where('name', 'like', $like);
                    })
                    ->orWhereHas('administrationRoute', function ($rq) use ($like) {
                        $rq->where('code', 'like', $like)
                            ->orWhere('name', 'like', $like);
                    });
            });
        }

        $total = (clone $query)->count();
        $rows = $query->skip($offset)->take($limit)->get();

        return response()->json([
            'data' => $rows,
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Immunization::class);

        $data = $request->validate([
            'vaccinee_id' => ['required', 'exists:vaccinees,id'],
            'vaccine_id' => ['required', 'exists:vaccines,id'],
            'administered_by' => ['nullable', 'exists:users,id'],
            'batch_number' => [
                Rule::requiredIf(fn () => $request->input('outcome', 'administered') === 'administered'),
                'nullable',
                'string',
                'max:255',
            ],
            'facility_vaccine_inventory_id' => ['nullable', 'integer', 'exists:facility_vaccine_inventory,id'],
            'vial_barcode' => ['nullable', 'string', 'max:255'],
            'expiry_date' => ['nullable', 'date'],
            'vvm_confirmed' => ['sometimes', 'boolean'],
            'date_administered' => ['nullable', 'date'],
            'dose_number' => ['nullable', 'integer', 'min:0', 'max:255'],
            'total_doses_required' => ['nullable', 'integer', 'min:0', 'max:255'],
            'administration_route_id' => ['nullable', 'integer', 'exists:administration_routes,id'],
            'route' => ['nullable', 'string', 'max:50'],
            'next_due_date' => ['nullable', 'date'],
            'followup_scheduled' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'max:50'],
            'external_id' => ['nullable', 'string', 'max:255'],
            'outcome' => ['required', 'in:administered,refused'],
            'injection_site' => ['nullable', 'string', 'max:100'],
        ]);

        $outcome = $data['outcome'];

        if ($outcome === 'administered') {
            if (! ($data['vvm_confirmed'] ?? false)) {
                throw ValidationException::withMessages([
                    'vvm_confirmed' => ['Confirm that the VVM indicates this vial is usable.'],
                ]);
            }
            $routeId = $this->resolveAdministrationRouteId(
                isset($data['administration_route_id']) ? (int) $data['administration_route_id'] : null,
                $data['route'] ?? null
            );
            unset($data['route']);
            if ($routeId === null) {
                throw ValidationException::withMessages([
                    'route' => ['A valid administration route is required.'],
                ]);
            }
            $data['administration_route_id'] = $routeId;
        } else {
            unset($data['route'], $data['administration_route_id']);
            $data['administration_route_id'] = null;
            $data['facility_vaccine_inventory_id'] = null;
            $data['vial_barcode'] = null;
            $data['expiry_date'] = null;
            $data['vvm_confirmed'] = false;
        }

        $vaccinee = Vaccinee::findOrFail($data['vaccinee_id']);
        $this->authorize('view', $vaccinee);

        $data['facility_id'] = $vaccinee->facility_id;

        if (! empty($data['administered_by'])) {
            // Optional: ensure user exists; policy on User not needed for id reference
        } else {
            $data['administered_by'] = $request->user()->id;
        }

        if ($outcome === 'administered' && empty($data['facility_vaccine_inventory_id']) && empty($data['expiry_date'])) {
            throw ValidationException::withMessages([
                'expiry_date' => ['Expiry date is required when not selecting a facility stock line.'],
            ]);
        }

        $immunization = DB::transaction(function () use ($data, $outcome) {
            $inventoryId = isset($data['facility_vaccine_inventory_id'])
                ? (int) $data['facility_vaccine_inventory_id']
                : null;

            if ($outcome === 'administered' && $inventoryId !== null) {
                /** @var FacilityVaccineInventory $inv */
                $inv = FacilityVaccineInventory::query()->lockForUpdate()->findOrFail($inventoryId);

                if ((int) $inv->facility_id !== (int) $data['facility_id']) {
                    throw ValidationException::withMessages([
                        'facility_vaccine_inventory_id' => ['Stock line does not belong to this patient\'s facility.'],
                    ]);
                }
                if ((int) $inv->vaccine_id !== (int) $data['vaccine_id']) {
                    throw ValidationException::withMessages([
                        'facility_vaccine_inventory_id' => ['Stock line does not match the selected vaccine.'],
                    ]);
                }
                if ($inv->quantity_on_hand < 1) {
                    throw ValidationException::withMessages([
                        'facility_vaccine_inventory_id' => ['No doses remaining for this stock line.'],
                    ]);
                }

                if (! empty($inv->batch_number) && isset($data['batch_number'])
                    && trim((string) $data['batch_number']) !== trim((string) $inv->batch_number)) {
                    throw ValidationException::withMessages([
                        'batch_number' => ['Batch/lot must match the selected stock line.'],
                    ]);
                }

                $data['batch_number'] = $data['batch_number'] ?? $inv->batch_number;
                $data['expiry_date'] = $data['expiry_date'] ?? $inv->expiry_date?->format('Y-m-d');

                $inv->quantity_on_hand = $inv->quantity_on_hand - 1;
                $inv->save();
            }

            return Immunization::create($data);
        });

        $this->followupService->applyNextDueFromRules($immunization);
        $immunization->save();

        $immunization->refresh();
        $this->followupService->syncSmsReminder($immunization);

        return response()->json(
            $immunization->load(['vaccinee', 'vaccine', 'facility', 'administrator', 'administrationRoute', 'facilityVaccineInventory']),
            201
        );
    }

    public function show(Request $request, Immunization $immunization): JsonResponse
    {
        $this->authorize('view', $immunization);

        return response()->json(
            $immunization->load(['vaccinee', 'vaccine', 'facility', 'administrator', 'administrationRoute', 'facilityVaccineInventory'])
        );
    }

    public function update(Request $request, Immunization $immunization): JsonResponse
    {
        $this->authorize('update', $immunization);

        $data = $request->validate([
            'vaccine_id' => ['sometimes', 'exists:vaccines,id'],
            'administered_by' => ['sometimes', 'nullable', 'exists:users,id'],
            'batch_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'date_administered' => ['sometimes', 'nullable', 'date'],
            'dose_number' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'total_doses_required' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:255'],
            'administration_route_id' => ['sometimes', 'nullable', 'integer', 'exists:administration_routes,id'],
            'route' => ['sometimes', 'nullable', 'string', 'max:50'],
            'next_due_date' => ['sometimes', 'nullable', 'date'],
            'followup_scheduled' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'string', 'max:50'],
            'external_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'outcome' => ['sometimes', 'in:administered,refused'],
            'injection_site' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $outcome = $data['outcome'] ?? $immunization->outcome;

        if (($request->has('administration_route_id') || $request->has('route')) && $outcome === 'administered') {
            $routeId = $this->resolveAdministrationRouteId(
                $request->input('administration_route_id') !== null && $request->input('administration_route_id') !== ''
                    ? (int) $request->input('administration_route_id')
                    : null,
                $request->input('route')
            );
            unset($data['route']);
            if ($routeId !== null) {
                $data['administration_route_id'] = $routeId;
            }
        } else {
            unset($data['route']);
            if ($outcome === 'refused') {
                $data['administration_route_id'] = null;
            }
        }

        $immunization->update($data);

        $immunization->refresh();
        $this->followupService->applyNextDueFromRules($immunization);
        $immunization->save();

        $immunization->refresh();
        $this->followupService->syncSmsReminder($immunization);

        return response()->json(
            $immunization->fresh()->load(['vaccinee', 'vaccine', 'facility', 'administrator', 'administrationRoute'])
        );
    }

    public function destroy(Request $request, Immunization $immunization): JsonResponse
    {
        $this->authorize('delete', $immunization);
        $immunization->delete();

        return response()->json(null, 204);
    }
}
