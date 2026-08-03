// Mirrors the `user` object nested in backend/src/auth/auth.service.ts's
// login() response.
class AppUser {
  final String id;
  final String fullName;
  final String phoneNumber;
  final String role;

  const AppUser({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: json['id'] as String,
    fullName: json['full_name'] as String,
    phoneNumber: json['phone_number'] as String,
    role: json['role'] as String,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'full_name': fullName,
    'phone_number': phoneNumber,
    'role': role,
  };
}
