const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const testDirectory = mkdtempSync(path.join(tmpdir(), 'blog-tests-'));
process.env.BLOG_DB_PATH = path.join(testDirectory, 'blog.db');

const app = require('../app');
const db = require('../database');
const bcrypt = require('bcrypt');

let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
    rmSync(testDirectory, { recursive: true, force: true });
});

function request(route, options) {
    return fetch(`${baseUrl}${route}`, { redirect: 'manual', ...options });
}

function postForm(route, values) {
    return request(route, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(values)
    });
}

function getUser(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (error, user) => {
            if (error) reject(error);
            else resolve(user);
        });
    });
}

function countUsers(username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) AS count FROM users WHERE username = ?', [username], (error, row) => {
            if (error) reject(error);
            else resolve(row.count);
        });
    });
}

test('GET /auth/login renders the login form', async () => {
    const response = await request('/auth/login');
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Login/);
});

test('unauthenticated home request redirects to login', async () => {
    const response = await request('/');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/auth/login');
});

test('unauthenticated new-post page redirects to login', async () => {
    const response = await request('/new-post');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/auth/login');
});

test('unauthenticated post creation redirects to login', async () => {
    const response = await postForm('/new-post', { title: 'Test', content: 'Body' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/auth/login');
});

test('non-admin user is denied access to the admin page', async () => {
    const response = await request('/admin');
    assert.equal(response.status, 403);
    assert.match(await response.text(), /Access denied/);
});

test('registration stores a hashed password and redirects to login', async () => {
    const response = await postForm('/auth/register', { username: 'alice', password: 'correct-horse' });
    const user = await getUser('alice');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/auth/login');
    assert.notEqual(user.password, 'correct-horse');
    assert.equal(bcrypt.compareSync('correct-horse', user.password), true);
});

test('registering the same username twice creates only one user', async () => {
    await postForm('/auth/register', { username: 'alice', password: 'another-password' });
    assert.equal(await countUsers('alice'), 1);
});

test('valid login sets an HTTP-only session cookie', async () => {
    const response = await postForm('/auth/login', { username: 'alice', password: 'correct-horse' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/');
    assert.match(response.headers.get('set-cookie'), /sessionId=.*HttpOnly/);
});

test('invalid login displays an authentication error', async () => {
    const response = await postForm('/auth/login', { username: 'alice', password: 'wrong-password' });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Invalid username or password/);
});

test('logout clears the session cookie and redirects to login', async () => {
    const response = await request('/auth/logout');
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/auth/login');
    assert.match(response.headers.get('set-cookie'), /sessionId=;/);
});
