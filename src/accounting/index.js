const readline = require('node:readline');

const INITIAL_BALANCE_CENTS = 100000;
const MAX_BALANCE_CENTS = 99999999;

class AccountData {
  constructor(initialBalanceCents = INITIAL_BALANCE_CENTS) {
    this.storageBalanceCents = initialBalanceCents;
  }

  read() {
    return this.storageBalanceCents;
  }

  write(balanceCents) {
    if (!Number.isSafeInteger(balanceCents) || balanceCents < 0 || balanceCents > MAX_BALANCE_CENTS) {
      throw new RangeError('Balance must be between 0.00 and 999999.99.');
    }
    this.storageBalanceCents = balanceCents;
  }
}

class AccountOperations {
  constructor(data = new AccountData()) {
    this.data = data;
  }

  total() {
    return this.data.read();
  }

  credit(amountCents) {
    const balanceCents = this.data.read();
    const updatedBalanceCents = balanceCents + amountCents;
    this.data.write(updatedBalanceCents);
    return updatedBalanceCents;
  }

  debit(amountCents) {
    const balanceCents = this.data.read();
    if (balanceCents < amountCents) {
      return { success: false, balanceCents };
    }

    const updatedBalanceCents = balanceCents - amountCents;
    this.data.write(updatedBalanceCents);
    return { success: true, balanceCents: updatedBalanceCents };
  }
}

function parseAmount(input) {
  const normalizedInput = input.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedInput)) {
    return null;
  }

  const amountCents = Math.round(Number(normalizedInput) * 100);
  return Number.isSafeInteger(amountCents) ? amountCents : null;
}

function formatBalance(balanceCents) {
  return (balanceCents / 100).toFixed(2);
}

function createApplication(input = process.stdin, output = process.stdout) {
  const operations = new AccountOperations();
  const interface = readline.createInterface({ input, output });
  const lines = interface[Symbol.asyncIterator]();

  async function readLine(prompt) {
    output.write(prompt);
    const result = await lines.next();
    return result.done ? null : result.value;
  }

  function displayMenu() {
    output.write('--------------------------------\n');
    output.write('Account Management System\n');
    output.write('1. View Balance\n');
    output.write('2. Credit Account\n');
    output.write('3. Debit Account\n');
    output.write('4. Exit\n');
    output.write('--------------------------------\n');
  }

  function askAmount(operationName) {
    return readLine(`Enter ${operationName} amount: `).then((inputAmount) => {
      if (inputAmount === null) {
        return null;
      }

      const amountCents = parseAmount(inputAmount);
      if (amountCents === null) {
        output.write('Invalid amount. Enter a non-negative amount with up to two decimal places.\n');
        return null;
      }
      return amountCents;
    });
  }

  async function run() {
    let continueRunning = true;
    while (continueRunning) {
      displayMenu();
      const choice = await readLine('Enter your choice (1-4): ');
      if (choice === null) {
        break;
      }

      switch (choice.trim()) {
        case '1':
          output.write(`Current balance: ${formatBalance(operations.total())}\n`);
          break;
        case '2': {
          const amountCents = await askAmount('credit');
          if (amountCents !== null) {
            try {
              const balanceCents = operations.credit(amountCents);
              output.write(`Amount credited. New balance: ${formatBalance(balanceCents)}\n`);
            } catch (error) {
              output.write(`${error.message}\n`);
            }
          }
          break;
        }
        case '3': {
          const amountCents = await askAmount('debit');
          if (amountCents !== null) {
            const result = operations.debit(amountCents);
            if (result.success) {
              output.write(`Amount debited. New balance: ${formatBalance(result.balanceCents)}\n`);
            } else {
              output.write('Insufficient funds for this debit.\n');
            }
          }
          break;
        }
        case '4':
          continueRunning = false;
          break;
        default:
          output.write('Invalid choice, please select 1-4.\n');
      }
    }

    output.write('Exiting the program. Goodbye!\n');
    interface.close();
  }

  return { run, operations };
}

if (require.main === module) {
  createApplication().run();
}

module.exports = {
  AccountData,
  AccountOperations,
  createApplication,
  formatBalance,
  parseAmount,
};
