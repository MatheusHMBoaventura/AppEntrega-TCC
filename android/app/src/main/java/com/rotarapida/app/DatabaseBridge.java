package com.rotarapida.app;

import android.content.Context;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;

public class DatabaseBridge {
    private Context context;
    private DatabaseHelper dbHelper;

    public DatabaseBridge(Context context) {
        this.context = context;
        this.dbHelper = new DatabaseHelper(context);
    }

    @JavascriptInterface
    public String register(String name, String email, String phone, String plate, String password, String type) {
        try {
            if (name == null || name.trim().isEmpty() ||
                email == null || email.trim().isEmpty() ||
                password == null || password.trim().isEmpty() ||
                type == null || type.trim().isEmpty()) {
                return "Preencha todos os campos obrigatórios.";
            }

            if (dbHelper.checkEmailExists(email)) {
                return "O e-mail informado já está cadastrado.";
            }

            long id = dbHelper.addUser(name, email, phone, plate, password, type);
            if (id > 0) {
                return "SUCCESS";
            } else {
                return "Erro ao salvar usuário no banco de dados SQLite.";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "ERROR: " + e.getMessage();
        }
    }

    @JavascriptInterface
    public String login(String email, String password, String type) {
        try {
            if (email == null || email.trim().isEmpty() ||
                password == null || password.trim().isEmpty() ||
                type == null || type.trim().isEmpty()) {
                return "ERROR: E-mail e senha são obrigatórios.";
            }

            User user = dbHelper.getUser(email, password, type);
            if (user != null) {
                JSONObject json = new JSONObject();
                json.put("id", user.id);
                json.put("name", user.name);
                json.put("email", user.email);
                json.put("phone", user.phone);
                json.put("plate", user.plate);
                json.put("type", user.type);
                return json.toString();
            } else {
                return "ERROR: E-mail ou senha incorretos para o tipo de conta selecionado.";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "ERROR: " + e.getMessage();
        }
    }
}
