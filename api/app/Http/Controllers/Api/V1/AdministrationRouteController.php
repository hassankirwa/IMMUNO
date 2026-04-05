<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AdministrationRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdministrationRouteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AdministrationRoute::class);

        $rows = AdministrationRoute::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $rows]);
    }
}
