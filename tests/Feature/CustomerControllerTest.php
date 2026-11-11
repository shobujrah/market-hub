<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_only_shop_listings_with_shop_specific_details(): void
    {
        $owner = User::factory()->create(['role' => 'shop_owner']);
        $shop = Shop::create([
            'owner_id' => $owner->id,
            'name' => 'North Shop',
            'slug' => 'north-shop',
        ]);
        $listedProduct = Product::create([
            'user_id' => $owner->id,
            'name' => 'Listed product',
            'slug' => 'listed-product',
            'description' => 'Catalog description',
            'thumbnail' => 'https://example.com/catalog.jpg',
            'price' => 10,
        ]);
        $unlistedProduct = Product::create([
            'user_id' => $owner->id,
            'name' => 'Unlisted product',
            'slug' => 'unlisted-product',
            'price' => 5,
        ]);

        $shop->products()->attach($listedProduct->id, [
            'price' => 18.5,
            'description' => 'North Shop description',
            'thumbnail' => 'https://example.com/north-shop.jpg',
        ]);

        $response = $this->getJson('/api/customer/products');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.product_name', 'Listed product')
            ->assertJsonPath('0.shop_name', 'North Shop')
            ->assertJsonPath('0.description', 'North Shop description')
            ->assertJsonPath('0.thumbnail', 'https://example.com/north-shop.jpg');

        $this->assertSame(18.5, (float) $response->json('0.price'));
        $this->assertDatabaseMissing('product_shop', [
            'product_id' => $unlistedProduct->id,
            'shop_id' => $shop->id,
        ]);
    }
}
