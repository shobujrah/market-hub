<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_manages_shop_owner_accounts_shops_and_catalog_products(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum');

        $ownerResponse = $this->postJson('/api/admin/shop-owners', [
            'name' => 'Shop Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $ownerResponse->assertCreated()
            ->assertJsonPath('role', 'shop_owner');
        $ownerId = $ownerResponse->json('id');

        $shopResponse = $this->postJson('/api/admin/shops', [
            'name' => 'Admin Shop',
            'owner_id' => $ownerId,
            'description' => 'Shop description',
        ]);
        $shopResponse->assertCreated();
        $shopId = $shopResponse->json('id');

        $productResponse = $this->postJson('/api/admin/products', [
            'name' => 'Admin catalog product',
            'description' => 'Catalog description',
            'thumbnail' => 'https://example.com/product.jpg',
            'price' => 12,
        ]);
        $productResponse->assertCreated()
            ->assertJsonPath('name', 'Admin catalog product');
        $productId = $productResponse->json('id');

        $this->putJson("/api/admin/shop-owners/{$ownerId}", [
            'name' => 'Updated Owner',
        ])->assertOk()->assertJsonPath('name', 'Updated Owner');

        $this->putJson("/api/admin/shops/{$shopId}", [
            'name' => 'Updated Shop',
        ])->assertOk()->assertJsonPath('name', 'Updated Shop');

        $productUpdate = $this->putJson("/api/admin/products/{$productId}", [
            'price' => 15,
        ])->assertOk();
        $this->assertSame(15.0, (float) $productUpdate->json('price'));

        $this->assertDatabaseHas('users', [
            'id' => $ownerId,
            'name' => 'Updated Owner',
            'role' => 'shop_owner',
        ]);
        $this->assertDatabaseHas('shops', [
            'id' => $shopId,
            'name' => 'Updated Shop',
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'price' => 15,
        ]);

        $this->deleteJson("/api/admin/shops/{$shopId}")->assertOk();
        $this->deleteJson("/api/admin/products/{$productId}")->assertOk();

        $this->assertDatabaseMissing('shops', ['id' => $shopId]);
        $this->assertDatabaseMissing('products', ['id' => $productId]);
    }

    public function test_admin_dashboard_includes_the_latest_ten_shops_customers_and_products(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create(['role' => 'shop_owner']);

        foreach (range(1, 12) as $index) {
            $createdAt = now()->addSeconds($index);

            User::factory()->create([
                'role' => 'customer',
                'name' => "Customer {$index}",
                'created_at' => $createdAt,
            ]);

            $shop = Shop::create([
                'owner_id' => $owner->id,
                'name' => "Shop {$index}",
                'slug' => "shop-{$index}",
            ]);
            $shop->created_at = $createdAt;
            $shop->save();

            $product = Product::create([
                'user_id' => $admin->id,
                'name' => "Product {$index}",
                'slug' => "product-{$index}",
                'price' => $index,
            ]);
            $product->created_at = $createdAt;
            $product->save();
        }

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard');

        $response->assertOk()
            ->assertJsonCount(10, 'recent.customers')
            ->assertJsonPath('recent.customers.0.name', 'Customer 12')
            ->assertJsonPath('recent.customers.9.name', 'Customer 3')
            ->assertJsonPath('shops.0.name', 'Shop 12')
            ->assertJsonPath('shops.9.name', 'Shop 3')
            ->assertJsonPath('products.0.name', 'Product 12')
            ->assertJsonPath('products.9.name', 'Product 3');
    }

    public function test_non_admin_cannot_manage_catalog_entities(): void
    {
        $owner = User::factory()->create(['role' => 'shop_owner']);
        $shop = Shop::create([
            'owner_id' => $owner->id,
            'name' => 'Owner Shop',
            'slug' => 'owner-shop',
        ]);
        $product = Product::create([
            'user_id' => $owner->id,
            'name' => 'Owner product',
            'slug' => 'owner-product',
            'price' => 10,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/admin/products/{$product->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $product->id]);
        $this->assertDatabaseHas('shops', ['id' => $shop->id]);
    }
}
