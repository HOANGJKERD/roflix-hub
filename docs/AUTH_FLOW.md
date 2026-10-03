# RoFlix Auth Flow

```text
Register
  -> Supabase Auth auth.users
  -> roflix_auth_user_created
  -> public.profiles
  -> role=user

Admin
  -> public.profiles.role=admin
  -> Admin Center
```

Tài khoản không được lưu bằng `roflix-users` local nữa. `localStorage` chỉ còn phục vụ một số dữ liệu UI/cache/profile cá nhân.
