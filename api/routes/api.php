<?php

use App\Http\Controllers\Api\V1\AdministrationRouteController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChannelGatewaySettingsController;
use App\Http\Controllers\Api\V1\FacilityController;
use App\Http\Controllers\Api\V1\FacilityVaccineInventoryController;
use App\Http\Controllers\Api\V1\GuardianController;
use App\Http\Controllers\Api\V1\ImmunizationController;
use App\Http\Controllers\Api\V1\ReminderMessageTemplateController;
use App\Http\Controllers\Api\V1\ReminderSettingsController;
use App\Http\Controllers\Api\V1\ScheduledReminderController;
use App\Http\Controllers\Api\V1\SessionPlanningController;
use App\Http\Controllers\Api\V1\StatsController;
use App\Http\Controllers\Api\V1\VaccineController;
use App\Http\Controllers\Api\V1\VaccineeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('/auth/password', [AuthController::class, 'updatePassword']);
        Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);
        Route::delete('/auth/avatar', [AuthController::class, 'deleteAvatar']);
        Route::get('/bootstrap', [AuthController::class, 'bootstrap']);

        Route::get('/stats', StatsController::class);

        Route::get('/session-planning', [SessionPlanningController::class, 'show']);
        Route::post('/session-planning/visits', [SessionPlanningController::class, 'upsertVisit']);
        Route::patch('/session-planning/visits/{sessionVisit}', [SessionPlanningController::class, 'updateVisit']);

        Route::get('/administration-routes', [AdministrationRouteController::class, 'index']);

        Route::apiResource('facilities', FacilityController::class);
        Route::apiResource('vaccinees', VaccineeController::class);
        Route::apiResource('guardians', GuardianController::class);
        Route::get('/vaccines/{vaccine}/dose-intervals', [VaccineController::class, 'doseIntervals']);
        Route::put('/vaccines/{vaccine}/dose-intervals', [VaccineController::class, 'syncDoseIntervals']);
        Route::apiResource('vaccines', VaccineController::class);
        Route::apiResource('immunizations', ImmunizationController::class);
        Route::apiResource('inventory', FacilityVaccineInventoryController::class);
        Route::get('/reminder-settings', [ReminderSettingsController::class, 'show']);
        Route::put('/reminder-settings', [ReminderSettingsController::class, 'update']);
        Route::get('/channel-gateway-settings', [ChannelGatewaySettingsController::class, 'show']);
        Route::put('/channel-gateway-settings', [ChannelGatewaySettingsController::class, 'update']);
        Route::apiResource('reminder-templates', ReminderMessageTemplateController::class);
        Route::apiResource('reminders', ScheduledReminderController::class);
    });
});
