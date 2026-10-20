const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

const authRoutes = require('./routes/auth');
const db = require('./database');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Middleware to check for session cookie
app.use((req, res, next) => {
    if (req.cookies.sessionId) {
        console.log('SessionId found: ', req.cookies.sessionId);
        db.get("SELECT * FROM users WHERE sessionId = ?", [req.cookies.sessionId], (err, user) => {
            if (err) throw err;
            if (user) {
              console.log('User found: ', user);
              req.user = user;
            }
            next();
        });
    } else {
        console.log('No sessionId');
        next();
    }
});

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
    if (!req.user) {
        return res.redirect('/auth/login');
    }
    db.all("SELECT * FROM posts", (err, rows) => {
        if (err) throw err;
        res.render('index', { title: 'My Blog', posts: rows, user: req.user });
    });
});

app.get('/new-post', (req, res) => {
  if (!req.user) {
      return res.redirect('/auth/login');
  }
  res.render('new-post', { title: 'New Post', user: req.user });
});

app.post('/new-post', (req, res) => {
  if (!req.user) {
      return res.redirect('/auth/login');
  }
  const { title, content } = req.body;
  db.run("INSERT INTO posts (title, content) VALUES (?, ?)", [title, content], (err) => {
      if (err) throw err;
      res.redirect('/');
  });
});

app.get('/admin', (req, res) => {
  if (!req.user || req.user.username !== 'admin') {
      return res.status(403).send('Access denied');
  }
  res.render('admin', { title: 'Admin Page', user: req.user });
});

//app.listen(port, () => {
//    console.log(`Server is running on http://localhost:${port}`);
//});

module.exports = app;