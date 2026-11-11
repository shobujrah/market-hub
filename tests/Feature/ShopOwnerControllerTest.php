<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopOwnerControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_edit_and_remove_a_shop_listing(): void
    {
        $owner = User::factory()->create(['role' => 'shop_owner']);
        $shop = Shop::create([
            'owner_id' => $owner->id,
            'name' => 'Owner Shop',
            'slug' => 'owner-shop',
        ]);

        $creation = $this->actingAs($owner, 'sanctum')->postJson('/api/owner/products', [
            'name' => 'Owner product',
            'description' => 'Shared description',
            'thumbnail' => 'https://example.com/shared.jpg',
            'price' => 10,
            'shop_id' => $shop->id,
        ]);

        $creation->assertCreated()
            ->assertJsonPath('name', 'Owner product');

        $product = Product::query()->where('name', 'Owner product')->firstOrFail();
        $this->assertDatabaseHas('product_shop', [
            'product_id' => $product->id,
            'shop_id' => $shop->id,
        ]);

        $this->putJson("/api/owner/shops/{$shop->id}/products/{$product->id}", [
            'price' => 18.5,
            'description' => 'Shop-specific description',
            'thumbnail' => 'https://example.com/shop.jpg',
        ])->assertOk();

        $this->assertSame(10.0, (float) $product->fresh()->price);

        $customerProducts = $this->getJson('/api/customer/products');
        $customerProducts->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.description', 'Shop-specific description')
            ->assertJsonPath('0.thumbnail', 'https://example.com/shop.jpg');
        $this->assertSame(18.5, (float) $customerProducts->json('0.price'));

        $this->deleteJson("/api/owner/shops/{$shop->id}/products/{$product->id}")
            ->assertOk();

        $this->assertDatabaseMissing('product_shop', [
            'product_id' => $product->id,
            'shop_id' => $shop->id,
        ]);
        $this->getJson('/api/customer/products')->assertOk()->assertJsonCount(0);
    }

    public function test_owner_can_list_and_assign_products_created_by_admin_and_other_owners(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create(['role' => 'shop_owner']);
        $otherOwner = User::factory()->create(['role' => 'shop_owner']);
        $shop = Shop::create([
            'owner_id' => $owner->id,
            'name' => 'Owner Shop',
            'slug' => 'owner-shop',
        ]);
        $adminProduct = Product::create([
            'user_id' => $admin->id,
            'name' => 'Admin catalog product',
            'slug' => 'admin-catalog-product',
            'price' => 12,
        ]);
        $otherOwnerProduct = Product::create([
            'user_id' => $otherOwner->id,
            'name' => 'Other owner product',
            'slug' => 'other-owner-product',
            'price' => 15,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/owner/catalog')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $adminProduct->id])
            ->assertJsonFragment(['id' => $otherOwnerProduct->id]);

        $this->postJson("/api/owner/shops/{$shop->id}/products", [
            'product_id' => $otherOwnerProduct->id,
            'price' => 21,
            'description' => 'Owner-specific description',
        ])->assertOk();

        $this->assertDatabaseHas('product_shop', [
            'shop_id' => $shop->id,
            'product_id' => $otherOwnerProduct->id,
            'price' => 21,
            'description' => 'Owner-specific description',
        ]);
    }

    public function test_owner_cannot_create_or_edit_a_listing_for_another_owners_shop(): void
    {
        $owner = User::factory()->create(['role' => 'shop_owner']);
        $otherOwner = User::factory()->create(['role' => 'shop_owner']);
        $otherShop = Shop::create([
            'owner_id' => $otherOwner->id,
            'name' => 'Other Shop',
            'slug' => 'other-shop',
        ]);
        $ownShop = Shop::create([
            'owner_id' => $owner->id,
            'name' => 'Owner Shop',
            'slug' => 'owner-shop',
        ]);
        $unlistedProduct = Product::create([
            'user_id' => $owner->id,
            'name' => 'Unlisted product',
            'slug' => 'unlisted-product',
            'price' => 3,
        ]);
        $product = Product::create([
            'user_id' => $otherOwner->id,
            'name' => 'Other product',
            'slug' => 'other-product',
            'price' => 10,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/owner/products', [
                'name' => 'Unauthorized product',
                'price' => 4,
                'shop_id' => $otherShop->id,
            ])
            ->assertUnprocessable();

        $this->putJson("/api/owner/shops/{$otherShop->id}/products/{$product->id}", [
            'price' => 1,
        ])->assertNotFound();

        $this->putJson("/api/owner/shops/{$ownShop->id}/products/{$unlistedProduct->id}", [
            'price' => 1,
        ])->assertNotFound();

        $this->assertDatabaseMissing('products', ['name' => 'Unauthorized product']);
        $this->assertDatabaseMissing('product_shop', [
            'product_id' => $product->id,
            'shop_id' => $otherShop->id,
        ]);
        $this->assertDatabaseMissing('product_shop', [
            'product_id' => $unlistedProduct->id,
            'shop_id' => $ownShop->id,
        ]);
    }
}
