# Import Users Feature Test & Git

## Status: Server running (port 3000 in use)

## Steps:

✅ 1. Server Running
   Command: cd NNPTUD-C6-20260327 && npm start

2. [ ] Get ADMIN Token
   curl -X POST http://localhost:3000/api/v1/auth/register ^
   -H "Content-Type: application/json" ^
   -d "{\"username\":\"testadmin\",\"password\":\"Test123!\",\"email\":\"testadmin@example.com\"}"

   Then login:
   curl -X POST http://localhost:3000/api/v1/auth/login ^
   -H "Content-Type: application/json" ^
   -d "{\"username\":\"testadmin\",\"password\":\"Test123!\"}"
   Copy token from response.

3. [ ] Postman Test Import
   POST http://localhost:3000/api/v1/users/import 
   - Auth: Bearer token
   - Form-data: file = uploads/1774600791345-817113160.xlsx
   
4. [ ] Verify
   - Check /api/v1/users (new users)
   - Mailtrap inbox for emails

5. [ ] Git PR
   gh pr create -t "Import users tested"
