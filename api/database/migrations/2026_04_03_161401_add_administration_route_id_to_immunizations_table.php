<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->foreignId('administration_route_id')
                ->nullable()
                ->after('total_doses_required')
                ->constrained('administration_routes')
                ->nullOnDelete();
        });

        $routes = DB::table('administration_routes')->get(['id', 'code', 'name']);
        $byCode = [];
        $byName = [];
        foreach ($routes as $r) {
            $byCode[strtolower($r->code)] = $r->id;
            $byName[strtolower($r->name)] = $r->id;
        }

        $aliases = [
            'subcutaneous' => 'SC',
            'intradermal' => 'ID',
            'intramuscular' => 'IM',
        ];

        DB::table('immunizations')->orderBy('id')->chunkById(100, function ($rows) use ($byCode, $byName, $aliases) {
            foreach ($rows as $imm) {
                $raw = $imm->route;
                if ($raw === null || $raw === '') {
                    continue;
                }
                $key = strtolower(trim((string) $raw));
                $routeId = $byCode[$key] ?? $byName[$key] ?? null;
                if ($routeId === null && isset($aliases[$key])) {
                    $codeKey = strtolower($aliases[$key]);
                    $routeId = $byCode[$codeKey] ?? null;
                }
                if ($routeId !== null) {
                    DB::table('immunizations')->where('id', $imm->id)->update([
                        'administration_route_id' => $routeId,
                    ]);
                }
            }
        });

        Schema::table('immunizations', function (Blueprint $table) {
            $table->dropColumn('route');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->string('route')->nullable()->after('total_doses_required');
        });

        $routes = DB::table('administration_routes')->get(['id', 'code']);
        $idToCode = [];
        foreach ($routes as $r) {
            $idToCode[(int) $r->id] = $r->code;
        }

        DB::table('immunizations')->orderBy('id')->chunkById(100, function ($rows) use ($idToCode) {
            foreach ($rows as $imm) {
                $rid = $imm->administration_route_id;
                if ($rid === null) {
                    continue;
                }
                $code = $idToCode[(int) $rid] ?? null;
                if ($code !== null) {
                    DB::table('immunizations')->where('id', $imm->id)->update(['route' => $code]);
                }
            }
        });

        Schema::table('immunizations', function (Blueprint $table) {
            $table->dropForeign(['administration_route_id']);
            $table->dropColumn('administration_route_id');
        });
    }
};
