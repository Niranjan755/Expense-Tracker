import React, { useState, useEffect } from "react";

export default function ExpenseTracker() {
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem("users")) || []);
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem("transactions")) || []);
  const [newUser, setNewUser] = useState("");
  const [form, setForm] = useState({});
  const [lastDeleted, setLastDeleted] = useState(null);

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  const addUser = () => {
    if (newUser && !users.includes(newUser)) {
      setUsers([...users, newUser]);
      setForm({ ...form, [newUser]: { amount: "", paidBy: "Me" } });
      setNewUser("");
    }
  };

  const addTransaction = (user) => {
    const { amount, paidBy } = form[user];
    if (user && amount && paidBy) {
      const payer = paidBy === "Me" ? "Me" : user;
      const payee = paidBy === "Me" ? user : "Me";
      setTransactions([
        ...transactions,
        { user, amount: parseFloat(amount), paidBy, payer, payee }
      ]);
      setForm({ ...form, [user]: { amount: "", paidBy: "Me" } });
    }
  };

  const deleteTransaction = (index) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmDelete) return;

    const deleted = transactions[index];
    const newTransactions = [...transactions];
    newTransactions.splice(index, 1);
    setTransactions(newTransactions);
    setLastDeleted({ transaction: deleted, index });
  };

  const undoDelete = () => {
    if (lastDeleted) {
      const newTransactions = [...transactions];
      newTransactions.splice(lastDeleted.index, 0, lastDeleted.transaction);
      setTransactions(newTransactions);
      setLastDeleted(null);
    }
  };

  const calculateBalance = (user) => {
    let balance = 0;
    transactions.forEach(({ user: txUser, amount, paidBy }) => {
      if (txUser === user) {
        if (paidBy === "Me") {
          balance += amount;
        } else {
          balance -= amount;
        }
      }
    });
    return balance;
  };

  const getUserTransactions = (user) => {
    return transactions
      .map((tx, idx) => ({ ...tx, index: idx }))
      .filter((tx) => tx.user === user);
  };

  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
  };

  const inputStyle = {
    padding: "8px",
    margin: "5px 10px 5px 0",
    borderRadius: "4px",
    border: "1px solid #ccc",
    flex: 1
  };

  const buttonStyle = {
    padding: "8px 12px",
    borderRadius: "4px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    cursor: "pointer",
    margin: "5px 0"
  };

  const deleteButtonStyle = {
    marginLeft: "10px",
    backgroundColor: "#dc3545",
    display: "inline-block",
    verticalAlign: "middle"
  };

  const undoButtonStyle = {
    marginBottom: "20px",
    backgroundColor: "#28a745"
  };

  const selectStyle = {
    ...inputStyle
  };

  const balanceTextStyle = (balance) => ({
    color: balance > 0 ? "green" : balance < 0 ? "red" : "black",
    fontWeight: "bold"
  });

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "10px" }}>Add User</h2>
        <input
          type="text"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          placeholder="Enter user name"
          style={inputStyle}
        />
        <button onClick={addUser} style={buttonStyle}>Add</button>
      </div>

      {lastDeleted && (
        <button onClick={undoDelete} style={{ ...buttonStyle, ...undoButtonStyle }}>
          Undo Last Delete
        </button>
      )}

      {users.map((user, idx) => {
        const bal = calculateBalance(user);
        return (
          <div key={idx} style={cardStyle}>
            <h2>{user}'s Dashboard</h2>
            <div style={{ marginBottom: "10px" }}>
              <strong>Balance: </strong>
              <span style={balanceTextStyle(bal)}>
                {bal === 0 ? "settled up" : bal > 0 ? `${user} owes you $${bal}` : `you owe $${-bal} to ${user}`}
              </span>
            </div>

            <div style={{ marginBottom: "10px", display: "flex", flexWrap: "wrap" }}>
              <input
                type="number"
                placeholder="Amount"
                value={form[user]?.amount || ""}
                onChange={(e) => setForm({ ...form, [user]: { ...form[user], amount: e.target.value } })}
                style={inputStyle}
              />
              <select
                value={form[user]?.paidBy || "Me"}
                onChange={(e) => setForm({ ...form, [user]: { ...form[user], paidBy: e.target.value } })}
                style={selectStyle}
              >
                <option value="Me">Me</option>
                <option value="Other">{user}</option>
              </select>
              <button onClick={() => addTransaction(user)} style={buttonStyle}>Add</button>
            </div>

            <div>
              <h3>Transactions</h3>
              {getUserTransactions(user).map((tx) => (
                <div
                  key={tx.index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #eee"
                  }}
                >
                  <span>
                    {tx.paidBy === "Me"
                      ? `You paid $${tx.amount} to ${user}`
                      : `${user} paid $${tx.amount} to You`}
                  </span>
                  <button
                    onClick={() => deleteTransaction(tx.index)}
                    style={{ ...buttonStyle, ...deleteButtonStyle }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
