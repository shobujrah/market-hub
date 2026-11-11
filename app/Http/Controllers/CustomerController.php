<?php

namespace App\Http\Controllers;

use App\Models\Shop;

class CustomerController extends Controller
{
    public function products()
    {
        $shops = Shop::with('products')->get();
        $items = [];

        foreach ($shops as $shop) {
            foreach ($shop->products as $product) {
                $items[] = [
                    'id' => $product->id,
                    'shop_id' => $shop->id,
                    'shop_name' => $shop->name,
                    'product_name' => $product->name,
                    'description' => $product->pivot->description ?? $product->description,
                    'thumbnail' => $product->pivot->thumbnail ?? $product->thumbnail,
                    'price' => $product->pivot->price ?? $product->price,
                ];
            }
        }

        return response()->json($items);
    }
}
