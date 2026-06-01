package com.rotarapida.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "rotarapida.db";
    private static final int DATABASE_VERSION = 1;

    // Tabela de usuários
    private static final String TABLE_USERS = "users";
    private static final String KEY_ID = "id";
    private static final String KEY_NAME = "name";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_PHONE = "phone";
    private static final String KEY_PLATE = "plate";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_TYPE = "type";
    private static final String KEY_CREATED_AT = "created_at";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String CREATE_USERS_TABLE = "CREATE TABLE " + TABLE_USERS + "("
                + KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + KEY_NAME + " TEXT NOT NULL,"
                + KEY_EMAIL + " TEXT UNIQUE NOT NULL,"
                + KEY_PHONE + " TEXT,"
                + KEY_PLATE + " TEXT,"
                + KEY_PASSWORD + " TEXT NOT NULL,"
                + KEY_TYPE + " TEXT NOT NULL,"
                + KEY_CREATED_AT + " DATETIME DEFAULT CURRENT_TIMESTAMP"
                + ")";
        db.execSQL(CREATE_USERS_TABLE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_USERS);
        onCreate(db);
    }

    // Hash SHA-256 para salvar senhas de forma segura
    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
            return password; // Fallback para texto simples se o algoritmo falhar (improvável)
        }
    }

    // Verifica se um e-mail já existe no banco
    public boolean checkEmailExists(String email) {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = null;
        try {
            cursor = db.query(TABLE_USERS, new String[]{KEY_ID},
                    KEY_EMAIL + "=?", new String[]{email.trim().toLowerCase()},
                    null, null, null);
            return cursor != null && cursor.getCount() > 0;
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    // Adiciona um novo usuário
    public long addUser(String name, String email, String phone, String plate, String password, String type) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(KEY_NAME, name.trim());
        values.put(KEY_EMAIL, email.trim().toLowerCase());
        values.put(KEY_PHONE, phone.trim());
        values.put(KEY_PLATE, plate != null ? plate.trim() : "");
        values.put(KEY_PASSWORD, hashPassword(password));
        values.put(KEY_TYPE, type.trim().toLowerCase());

        return db.insert(TABLE_USERS, null, values);
    }

    // Busca um usuário válido pelas credenciais e tipo de conta
    public User getUser(String email, String password, String type) {
        SQLiteDatabase db = this.getReadableDatabase();
        String hashedPassword = hashPassword(password);
        Cursor cursor = null;
        try {
            cursor = db.query(TABLE_USERS,
                    new String[]{KEY_ID, KEY_NAME, KEY_EMAIL, KEY_PHONE, KEY_PLATE, KEY_TYPE},
                    KEY_EMAIL + "=? AND " + KEY_PASSWORD + "=? AND " + KEY_TYPE + "=?",
                    new String[]{email.trim().toLowerCase(), hashedPassword, type.trim().toLowerCase()},
                    null, null, null);

            if (cursor != null && cursor.moveToFirst()) {
                User user = new User();
                user.id = cursor.getInt(cursor.getColumnIndexOrThrow(KEY_ID));
                user.name = cursor.getString(cursor.getColumnIndexOrThrow(KEY_NAME));
                user.email = cursor.getString(cursor.getColumnIndexOrThrow(KEY_EMAIL));
                user.phone = cursor.getString(cursor.getColumnIndexOrThrow(KEY_PHONE));
                user.plate = cursor.getString(cursor.getColumnIndexOrThrow(KEY_PLATE));
                user.type = cursor.getString(cursor.getColumnIndexOrThrow(KEY_TYPE));
                return user;
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return null;
    }
}
