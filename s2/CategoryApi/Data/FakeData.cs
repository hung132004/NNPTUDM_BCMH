using CategoryApi.Models;

namespace CategoryApi.Data;

public static class FakeData
{
    public static List<Category> Categories = new()
    {
        new Category
        {
            Id = 7,
            Name = "Clothes",
            Slug = "clothes",
            Image = "https://i.imgur.com/QkIa5tT.jpeg",
            CreationAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        },
        new Category
        {
            Id = 8,
            Name = "Electronics",
            Slug = "electronics",
            Image = "https://i.imgur.com/ZANVnHE.jpeg",
            CreationAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        }
    };

    public static List<Product> Products = new()
    {
        new Product { Id = 1, Title = "T-Shirt", Price = 20, CategoryId = 7 },
        new Product { Id = 2, Title = "Laptop", Price = 1000, CategoryId = 8 },
        new Product { Id = 3, Title = "Jeans", Price = 40, CategoryId = 7 }
    };
}
