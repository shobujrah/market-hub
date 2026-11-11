<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'thumbnail',
        'price',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shops(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Shop::class, 'product_shop')
            ->withPivot(['price', 'description', 'thumbnail'])
            ->withTimestamps();
    }

    public function shopProducts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ShopProduct::class);
    }
}
