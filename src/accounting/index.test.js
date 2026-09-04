const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const {
  AccountData,
  AccountOperations,
  formatBalance,
  parseAmount,
} = require('./index');

function createOperations(initialBalance = 100000) {
  return new AccountOperations(new AccountData(initialBalance));
}

test('TC-001: a new account starts with a balance of 1000.00', () => {
  assert.equal(formatBalance(createOperations().total()), '1000.00');
});

test('TC-002: the menu contains all original options', () => {
  const result = spawnSync(process.execPath, ['index.js'], {
    cwd: __dirname,
    input: '4\n',
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /1\. View Balance/);
  assert.match(result.stdout, /2\. Credit Account/);
  assert.match(result.stdout, /3\. Debit Account/);
  assert.match(result.stdout, /4\. Exit/);
});

test('TC-003: viewing the balance reads without changing it', () => {
  const operations = createOperations();
  assert.equal(operations.total(), 100000);
  assert.equal(operations.total(), 100000);
});

test('TC-004: a valid credit increases and stores the balance', () => {
  const operations = createOperations();
  assert.equal(operations.credit(25000), 125000);
  assert.equal(operations.total(), 125000);
});

test('TC-005: multiple credits are cumulative', () => {
  const operations = createOperations();
  operations.credit(10000);
  operations.credit(5050);
  assert.equal(formatBalance(operations.total()), '1150.50');
});

test('TC-006: a one-cent credit is represented exactly', () => {
  const operations = createOperations();
  operations.credit(1);
  assert.equal(formatBalance(operations.total()), '1000.01');
});

test('TC-007: a debit below the balance succeeds', () => {
  const operations = createOperations();
  const result = operations.debit(30000);
  assert.deepEqual(result, { success: true, balanceCents: 70000 });
});

test('TC-008: a debit equal to the balance succeeds', () => {
  const operations = createOperations();
  const result = operations.debit(100000);
  assert.deepEqual(result, { success: true, balanceCents: 0 });
  assert.equal(operations.total(), 0);
});

test('TC-009: a debit above the balance is rejected without mutation', () => {
  const operations = createOperations();
  const result = operations.debit(100001);
  assert.deepEqual(result, { success: false, balanceCents: 100000 });
  assert.equal(operations.total(), 100000);
});

test('TC-010: insufficient funds uses the latest stored balance', () => {
  const operations = createOperations();
  operations.credit(10000);
  const result = operations.debit(110001);
  assert.equal(result.success, false);
  assert.equal(result.balanceCents, 110000);
  assert.equal(operations.total(), 110000);
});

test('TC-011: the remaining balance can be debited after a credit', () => {
  const operations = createOperations();
  operations.credit(20000);
  const result = operations.debit(120000);
  assert.deepEqual(result, { success: true, balanceCents: 0 });
});

test('TC-012: an invalid menu choice displays an error and continues to exit', () => {
  const result = spawnSync(process.execPath, ['index.js'], {
    cwd: __dirname,
    input: '5\n4\n',
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Invalid choice, please select 1-4\./);
  assert.match(result.stdout, /Exiting the program\. Goodbye!/);
});

test('TC-013: selecting exit terminates normally', () => {
  const result = spawnSync(process.execPath, ['index.js'], {
    cwd: __dirname,
    input: '4\n',
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Exiting the program\. Goodbye!/);
});

test('TC-014: all operations share the same stored balance', () => {
  const data = new AccountData();
  const operations = new AccountOperations(data);
  operations.credit(7525);
  assert.equal(formatBalance(operations.total()), '1075.25');
  operations.debit(2525);
  assert.equal(formatBalance(operations.total()), '1050.00');
});

test('TC-015: the maximum declared balance is supported', () => {
  const operations = createOperations(0);
  operations.credit(99999999);
  assert.equal(formatBalance(operations.total()), '999999.99');
});

test('TC-016: a credit beyond the declared balance capacity is rejected', () => {
  const operations = createOperations(99999998);
  assert.throws(() => operations.credit(2), /Balance must be between/);
  assert.equal(operations.total(), 99999998);
});

test('TC-017: a zero amount leaves the balance unchanged', () => {
  const operations = createOperations();
  operations.credit(0);
  const result = operations.debit(0);
  assert.equal(result.success, true);
  assert.equal(operations.total(), 100000);
});

test('TC-018: negative amounts are rejected during input parsing', () => {
  assert.equal(parseAmount('-1.00'), null);
  assert.equal(parseAmount('1.001'), null);
  assert.equal(parseAmount('not-a-number'), null);
});

test('TC-019: unsupported amount input does not produce a numeric value', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('READ'), null);
});