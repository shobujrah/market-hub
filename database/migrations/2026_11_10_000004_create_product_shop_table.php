<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_shop', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shop_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 10, 2)->default(0);
            $table->text('description')->nullable();
            $table->string('thumbnail')->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'shop_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_shop');
    }
};
