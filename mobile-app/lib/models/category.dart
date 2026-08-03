// Mirrors backend/src/categories/categories.mapper.ts's PublicCategory.
class Category {
  final int id;
  final String name;
  final String? iconUrl;
  final bool isActive;

  const Category({
    required this.id,
    required this.name,
    required this.iconUrl,
    required this.isActive,
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'] as int,
    name: json['name'] as String,
    iconUrl: json['icon_url'] as String?,
    isActive: json['is_active'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'icon_url': iconUrl,
    'is_active': isActive,
  };
}
