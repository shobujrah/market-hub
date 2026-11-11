<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'stats' => [
                'shops' => Shop::count(),
                'products' => Product::count(),
                'shop_owners' => User::where('role', 'shop_owner')->count(),
                'customers' => User::where('role', 'customer')->count(),
            ],
            'shops' => Shop::with('owner')->latest()->get(),
            'products' => Product::with('user')->latest()->get(),
            'recent' => [
                'customers' => User::where('role', 'customer')
                    ->latest()
                    ->limit(10)
                    ->get(['id', 'name', 'email', 'created_at']),
            ],
        ]);
    }

    public function indexShops()
    {
        return response()->json(Shop::with('owner')->latest()->get());
    }

    public function storeShop(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'owner_id' => ['required', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        $user = User::findOrFail($validated['owner_id']);

        if ($user->role !== 'shop_owner') {
            return response()->json(['message' => 'Selected user must be a shop owner.'], 422);
        }

        $shop = Shop::create([
            'owner_id' => $validated['owner_id'],
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(8)),
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json($shop->load('owner'), 201);
    }

    public function updateShop(Request $request, Shop $shop)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'owner_id' => ['sometimes', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        if (isset($validated['owner_id'])) {
            $user = User::findOrFail($validated['owner_id']);

            if ($user->role !== 'shop_owner') {
                return response()->json(['message' => 'Selected user must be a shop owner.'], 422);
            }
        }

        $shop->fill($validated);

        if ($request->filled('name')) {
            $shop->slug = Str::slug($request->name).'-'.$shop->id;
        }

        $shop->save();

        return response()->json($shop->fresh()->load('owner'));
    }

    public function destroyShop(Shop $shop)
    {
        $shop->delete();

        return response()->json(['message' => 'Shop deleted successfully']);
    }

    public function shopOwners()
    {
        return response()->json(User::where('role', 'shop_owner')->latest()->get());
    }

    public function storeShopOwner(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $validated['password'] = bcrypt($validated['password']);
        $validated['role'] = 'shop_owner';

        $user = User::create($validated);

        return response()->json($user, 201);
    }

    public function updateShopOwner(Request $request, User $shopOwner)
    {
        abort_unless($shopOwner->isShopOwner(), 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($shopOwner)],
        ]);

        $shopOwner->update($validated);

        return response()->json($shopOwner->fresh());
    }

    public function products()
    {
        return response()->json(Product::with('user')->latest()->get());
    }

    public function storeProduct(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['slug'] = Str::slug($validated['name']).'-'.Str::lower(Str::random(8));
        $validated['price'] = $validated['price'] ?? 0;

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    public function updateProduct(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        if ($request->filled('name')) {
            $validated['slug'] = Str::slug($request->name).'-'.$product->id;
        }

        $product->fill($validated);
        $product->save();

        return response()->json($product->fresh());
    }

    public function destroyProduct(Product $product)
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }
}
