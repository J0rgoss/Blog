const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(process.env.BLOG_DB_PATH || 'blog.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS posts (id INT, title TEXT, content TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS users (username TEXT, password TEXT, sessionId TEXT)");

 //   const stmt = db.prepare("INSERT INTO posts VALUES (?, ?, ?)");
 //   stmt.run(1, 'First Post', 'This is the content of the first post.');
 //   stmt.finalize();
});

module.exports = db;
