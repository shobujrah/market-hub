<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ShopOwnerController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::get('/customer/products', [CustomerController::class, 'products']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('/admin')->middleware('role:admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/shops', [AdminController::class, 'indexShops']);
        Route::post('/shops', [AdminController::class, 'storeShop']);
        Route::put('/shops/{shop}', [AdminController::class, 'updateShop']);
        Route::delete('/shops/{shop}', [AdminController::class, 'destroyShop']);
        Route::get('/shop-owners', [AdminController::class, 'shopOwners']);
        Route::post('/shop-owners', [AdminController::class, 'storeShopOwner']);
        Route::put('/shop-owners/{shopOwner}', [AdminController::class, 'updateShopOwner']);
        Route::get('/products', [AdminController::class, 'products']);
        Route::post('/products', [AdminController::class, 'storeProduct']);
        Route::put('/products/{product}', [AdminController::class, 'updateProduct']);
        Route::delete('/products/{product}', [AdminController::class, 'destroyProduct']);
    });

    Route::prefix('/owner')->middleware('role:shop_owner')->group(function () {
        Route::get('/dashboard', [ShopOwnerController::class, 'dashboard']);
        Route::get('/catalog', [ShopOwnerController::class, 'catalog']);
        Route::get('/shops', [ShopOwnerController::class, 'ownShops']);
        Route::post('/products', [ShopOwnerController::class, 'storeProduct']);
        Route::post('/shops/{shop}/products', [ShopOwnerController::class, 'assignProductToShop']);
        Route::put('/shops/{shop}/products/{product}', [ShopOwnerController::class, 'updateProductInShop']);
        Route::delete('/shops/{shop}/products/{product}', [ShopOwnerController::class, 'removeProductFromShop']);
    });
});
