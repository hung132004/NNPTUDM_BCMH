using Microsoft.AspNetCore.Mvc;
using CategoryApi.Data;
using CategoryApi.Models;

namespace CategoryApi.Controllers;

[ApiController]
[Route("api/v1/categories")]
public class CategoriesController : ControllerBase
{
    // GET ALL + search theo name
    [HttpGet]
    public IActionResult GetAll([FromQuery] string? name)
    {
        var data = FakeData.Categories.AsQueryable();

        if (!string.IsNullOrEmpty(name))
        {
            data = data.Where(c =>
                c.Name.Contains(name, StringComparison.OrdinalIgnoreCase));
        }

        return Ok(data);
    }

    // GET BY ID
    [HttpGet("{id:int}")]
    public IActionResult GetById(int id)
    {
        var category = FakeData.Categories.FirstOrDefault(c => c.Id == id);
        return category == null ? NotFound() : Ok(category);
    }

    // GET BY SLUG
    [HttpGet("slug/{slug}")]
    public IActionResult GetBySlug(string slug)
    {
        var category = FakeData.Categories.FirstOrDefault(c => c.Slug == slug);
        return category == null ? NotFound() : Ok(category);
    }

    // CREATE
    [HttpPost]
    public IActionResult Create(Category category)
    {
        category.Id = FakeData.Categories.Max(c => c.Id) + 1;
        category.CreationAt = DateTime.Now;
        category.UpdatedAt = DateTime.Now;

        FakeData.Categories.Add(category);
        return Ok(category);
    }

    // EDIT
    [HttpPut("{id}")]
    public IActionResult Edit(int id, Category model)
    {
        var category = FakeData.Categories.FirstOrDefault(c => c.Id == id);
        if (category == null) return NotFound();

        category.Name = model.Name;
        category.Slug = model.Slug;
        category.Image = model.Image;
        category.UpdatedAt = DateTime.Now;

        return Ok(category);
    }

    // DELETE
    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var category = FakeData.Categories.FirstOrDefault(c => c.Id == id);
        if (category == null) return NotFound();

        FakeData.Categories.Remove(category);
        return Ok("Deleted successfully");
    }

    // GET PRODUCTS BY CATEGORY ID
    // /api/v1/categories/{id}/products
    [HttpGet("{id}/products")]
    public IActionResult GetProductsByCategory(int id)
    {
        var products = FakeData.Products
            .Where(p => p.CategoryId == id);

        return Ok(products);
    }
}
