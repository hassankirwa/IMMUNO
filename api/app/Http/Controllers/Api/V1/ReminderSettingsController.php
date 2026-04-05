<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ReminderSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $row = ReminderSetting::query()->whereNull('facility_id')->firstOrFail();

        return response()->json($row);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $data = $request->validate([
            'offset_days' => ['required', 'array', 'min:1'],
            'offset_days.*' => ['integer', 'min:0', 'max:365'],
        ]);

        $row = ReminderSetting::query()->whereNull('facility_id')->firstOrFail();
        $row->update(['offset_days' => array_values($data['offset_days'])]);

        return response()->json($row->fresh());
    }
}
