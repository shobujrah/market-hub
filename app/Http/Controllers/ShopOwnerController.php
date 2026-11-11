<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ShopOwnerController extends Controller
{
    public function dashboard(Request $request)
    {
        $shops = $request->user()->shops()->with('products')->latest()->get();
        $catalog = Product::with('shops')->latest()->get();

        return response()->json([
            'shops' => $shops,
            'catalog' => $catalog,
        ]);
    }

    public function catalog()
    {
        return response()->json(Product::with('shops')->latest()->get());
    }

    public function ownShops(Request $request)
    {
        return response()->json($request->user()->shops()->with('products')->latest()->get());
    }

    public function storeProduct(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'shop_id' => [
                'nullable',
                Rule::exists('shops', 'id')->where('owner_id', $request->user()->id),
            ],
        ]);

        $product = DB::transaction(function () use ($request, $validated): Product {
            $product = $request->user()->products()->create([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(8)),
                'description' => $validated['description'] ?? null,
                'thumbnail' => $validated['thumbnail'] ?? null,
                'price' => $validated['price'] ?? 0,
            ]);

            if (! empty($validated['shop_id'])) {
                $shop = $request->user()->shops()->findOrFail($validated['shop_id']);
                $shop->products()->attach($product->id, [
                    'price' => $product->price,
                    'description' => $product->description,
                    'thumbnail' => $product->thumbnail,
                ]);
            }

            return $product;
        });

        return response()->json($product->fresh(), 201);
    }

    public function assignProductToShop(Request $request, Shop $shop)
    {
        $this->ensureShopBelongsToOwner($request, $shop);

        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
        ]);

        $product = Product::findOrFail($validated['product_id']);

        $shop->products()->syncWithoutDetaching([
            $product->id => [
                'price' => $validated['price'] ?? $product->price,
                'description' => $validated['description'] ?? $product->description,
                'thumbnail' => $validated['thumbnail'] ?? $product->thumbnail,
            ],
        ]);

        return response()->json($shop->fresh()->load('products'));
    }

    public function updateProductInShop(Request $request, Shop $shop, Product $product)
    {
        $this->ensureShopBelongsToOwner($request, $shop);

        $validated = $request->validate([
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
        ]);

        abort_unless($shop->products()->whereKey($product->getKey())->exists(), 404);

        $shop->products()->updateExistingPivot($product->id, $validated);

        return response()->json($shop->fresh()->load('products'));
    }

    public function removeProductFromShop(Request $request, Shop $shop, Product $product)
    {
        $this->ensureShopBelongsToOwner($request, $shop);
        abort_unless($shop->products()->whereKey($product->getKey())->exists(), 404);

        $shop->products()->detach($product->id);

        return response()->json(['message' => 'Product removed from shop.']);
    }

    private function ensureShopBelongsToOwner(Request $request, Shop $shop): void
    {
        abort_unless(
            $request->user()->shops()->whereKey($shop->getKey())->exists(),
            404,
        );
    }
}
