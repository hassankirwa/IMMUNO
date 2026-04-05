<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ReminderMessageTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reminder SMS templates — admin only (platform RBAC).
 */
class ReminderMessageTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $limit = min(100, max(1, (int) $request->query('limit', 50)));
        $offset = max(0, (int) $request->query('offset', 0));

        $query = ReminderMessageTemplate::query()->orderBy('name');

        $total = (clone $query)->count();
        $rows = $query->skip($offset)->take($limit)->get();

        return response()->json([
            'data' => $rows,
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $data = $request->validate([
            'facility_id' => ['nullable', 'exists:facilities,id'],
            'name' => ['required', 'string', 'max:255'],
            'body_template' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template = ReminderMessageTemplate::create($data);

        return response()->json($template, 201);
    }

    public function show(Request $request, ReminderMessageTemplate $reminder_template): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        return response()->json($reminder_template);
    }

    public function update(Request $request, ReminderMessageTemplate $reminder_template): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'body_template' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $reminder_template->update($data);

        return response()->json($reminder_template->fresh());
    }

    public function destroy(Request $request, ReminderMessageTemplate $reminder_template): JsonResponse
    {
        abort_unless($request->user()?->hasRole('admin'), 403);
        $reminder_template->delete();

        return response()->json(null, 204);
    }
}
