import type { Category } from "../../types/rental.types";

interface CategoryFilterProps {
    categories: Category[];
    selectedCategory: number | "all";
    onSelect: (categoryId: number | "all") => void;
}

function CategoryFilter({
    categories,
    selectedCategory,
    onSelect,
}: CategoryFilterProps) {
    return (
        <div className="category-filter">
            <button
                type="button"
                className={
                    selectedCategory === "all"
                        ? "category-chip category-chip--all active"
                        : "category-chip category-chip--all"
                }
                onClick={() => onSelect("all")}
            >
                Все помещения
            </button>

            {categories.map((category, index) => (
                <button
                    type="button"
                    key={category.category_id}
                    className={[
                        "category-chip",
                        `category-chip--${index % 6}`,
                        selectedCategory === category.category_id
                            ? "active"
                            : "",
                    ].join(" ")}
                    onClick={() => onSelect(category.category_id)}
                >
                    {category.name}
                </button>
            ))}
        </div>
    );
}

export default CategoryFilter;