# Market Hub

Market Hub is a Laravel and Vue.js e-commerce management application. Administrators can manage shops, shop-owner accounts, and a shared product catalog. Shop owners can select products from the shared catalog and list them in their own shops. They can also create new products that become available to other shop owners.

Customers can browse products assigned to shops and see shop-specific product information, prices, and thumbnails.

## Technology Stack

- Backend: Laravel (PHP)
- Frontend: Vue.js
- Database: MySQL
- Authentication: Laravel Sanctum
- Testing: PHPUnit
- Build Tool: Vite

## Requirements

Make sure the following software and extensions are installed:

- PHP 8.3 or later
- Composer 2
- Node.js 20.19+ or 22.12+
- npm
- MySQL 8.0+
- PHP PDO MySQL extension
- PHP SQLite3 and PDO SQLite extensions (required for running tests)

## Quick Setup (Preconfigured Project)

The complete project source code, required resources, and exported MySQL database backup are included in this public GitHub repository.

No additional source-code modifications or manual file creation are required.

Follow these steps to run the project:

### 1. Clone the Repository

```powershell
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Install PHP Dependencies

If the `vendor` directory is not included in the repository, run:

```powershell
composer install
```

### 3. Configure Environment

Create your local environment file:

```powershell
Copy-Item .env.example .env
```

Configure your MySQL database credentials in the `.env` file.

### 4. Import the Database

1. Open MySQL or phpMyAdmin.
2. Create a database named `csn_ecommerce`.
3. Import the provided SQL database backup file from the repository.
4. Make sure the database credentials in `.env` match your MySQL configuration.

### 5. Generate Application Key

If the application key is not already configured, run:

```powershell
php artisan key:generate
```

### 6. Frontend Dependencies

If the required frontend dependencies or compiled assets are not included, run:

```powershell
npm install
npm run build
```

### 7. Start the Application

Run:

```powershell
php artisan serve
```

### 8. Open the Application

Visit:

http://127.0.0.1:8000

The project is configured for local execution. If any initial dependency installation or environment configuration is required, follow the detailed Fresh Installation instructions below.

## Fresh Installation (Windows PowerShell)

Follow these steps to install and configure the project from a fresh setup.

### 1. Clone the Repository

```powershell
git clone YOUR_GITHUB_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Install PHP Dependencies

```powershell
composer install
```

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

### 3. Create a MySQL Database

Open MySQL or phpMyAdmin and execute:

```sql
CREATE DATABASE csn_ecommerce
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 4. Configure Environment

Open the `.env` file and configure your database credentials:

```env
APP_NAME="Market Hub"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=csn_ecommerce
DB_USERNAME=root
DB_PASSWORD=
```

Update the database username and password according to your MySQL configuration.

### 5. Generate Application Key and Run Migrations

```powershell
php artisan key:generate
php artisan migrate --seed
```

This command creates the required database tables and inserts the development seed data.

Note: For a fresh installation, use migrations and seeders. For the preconfigured database setup, import the provided SQL backup instead of running migrations and seeders again.

### 6. Install Frontend Dependencies

```powershell
npm install
```

Build the Vue.js frontend:

```powershell
npm run build
```

### 7. Start the Laravel Development Server

```powershell
php artisan serve
```

### 8. Open the Application

Visit:

http://127.0.0.1:8000

For frontend hot reloading during development, run the following command in a separate terminal:

```powershell
npm run dev
```

Keep the Vite development server running while developing.

## Development Accounts

The database seeder creates the following demonstration accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | admin@example.com | password123 |
| Shop Owner | owner@example.com | password123 |
| Customer | customer@example.com | password123 |

All seeded development users use the same password: `password123`.

Additional seeded users and their email addresses can be found in the `users` database table.

These credentials are intended for local development and demonstration purposes only. Do not use them in production.

## Using the Application

### Administrator

1. Sign in using the administrator credentials.
2. Access the admin dashboard.
3. Create and manage shop-owner accounts.
4. Create, update, and delete shops.
5. Manage products in the shared catalog.
6. View dashboard information, including the latest shops, customers, and products.

### Shop Owner

1. Sign in using a shop-owner account.
2. Access the shop-owner dashboard.
3. Select an assigned shop.
4. Browse products available in the shared catalog.
5. Add catalog products to the selected shop.
6. Create new products that become available in the shared catalog.
7. Update shop-specific product prices, descriptions, and thumbnail URLs.
8. Edit or remove product listings belonging to their own shops.

Shop owners can manage their own shop listings without changing the original shared catalog product.

### Customer

1. Open the public customer storefront.
2. Browse products assigned to shops.
3. View shop-specific product information, prices, and thumbnails.

Customers can only see products that have been assigned to a shop. Products that are not assigned to any shop are excluded from the customer storefront.

Public customer registration creates customer accounts only. Administrator and shop-owner accounts are managed through the administrator panel.

## Product Thumbnail Images

The application supports product thumbnails through image URLs.

Sample images are available in the following directory:

```text
public/
└── images/
    ├── shirt.jpg
    ├── pant.jpg
    └── sari.jpg
```

For local testing, the following image paths can be used:

| Product | Thumbnail URL |
|---|---|
| Shirt | `/images/shirt.jpg` |
| Pant | `/images/pant.jpg` |
| Sari | `/images/sari.jpg` |

Example:

```text
http://127.0.0.1:8000/images/shirt.jpg
```

Make sure the sample images are included in the repository under `public/images/`.

Shop owners can also provide external image URLs when creating or updating their shop product listings.

The thumbnail URL is managed independently for each shop listing, allowing different shops to display different product images.

## Database Structure

The application uses a shared product catalog and shop-specific product listings.

The main entities include:

- Users: Stores administrator, shop-owner, and customer accounts.
- Shops: Stores shop information and owner assignments.
- Products: Stores shared catalog products.
- Shop Product Listings: Connects products with shops and stores shop-specific information, including prices, descriptions, and thumbnail URLs.

Products created by administrators or shop owners can be made available through the shared catalog. Shop owners select products from this catalog and create their own shop listings.

## Automated Tests

The project includes automated feature and unit tests using PHPUnit.

The test suite uses an in-memory SQLite database and does not require the MySQL development database.

Run the test suite using:

```powershell
php artisan test --compact
```

Alternatively:

```powershell
php artisan test
```

Make sure the PHP SQLite3 and PDO SQLite extensions are enabled before running the tests.

## Main API Routes

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | User login |
| POST | `/api/register` | Customer registration |
| POST | `/api/logout` | User logout |
| GET | `/api/user` | Get authenticated user |

### Customer

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customer/products` | Retrieve products assigned to shops |

### Administrator

```text
/api/admin/*
```

Administrator endpoints support:

- Dashboard information
- Shop management
- Shop-owner account management
- Shared catalog product management

### Shop Owner

```text
/api/owner/*
```

Shop-owner endpoints support:

- Shop-owner dashboard
- Shared product catalog browsing
- Shop product listing management
- Shop-specific product information management

Administrator and shop-owner API routes require a valid Laravel Sanctum bearer token and the appropriate role permissions.

## Project Notes

- The `.env` file is not included in the repository.
- Use `.env.example` to configure your local environment.
- Database migrations and seeders are included.
- An exported MySQL database backup is included in the repository.
- Frontend dependencies are managed through npm.
- The compiled frontend assets are generated using Vite.
- Sample product thumbnail images are included in `public/images/`.
- The application is designed to run locally after following the installation instructions above.

## Developer Information

**Developer:** Md. Shobujur Rahman

**Project:** Market Hub

**Developed For:** CSN Bangladesh Limited - Technical Assessment

## License

This project was developed as a technical assessment for CSN Bangladesh Limited.
