<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
    ];

    public function owner(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function products(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_shop')
            ->withPivot(['price', 'description', 'thumbnail'])
            ->withTimestamps();
    }

    public function shopProducts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ShopProduct::class);
    }
}
