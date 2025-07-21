import React, { useEffect, useState } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, provider, db } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newUser, setNewUser] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState("Me");

  const userRef = user ? doc(db, "expenses", user.uid) : null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const ref = doc(db, "expenses", currentUser.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { users: [], transactions: [] });
        }

        onSnapshot(ref, (docSnap) => {
          const data = docSnap.data();
          setUsers(data.users || []);
          setTransactions(data.transactions || []);
        });
      } else {
        setUser(null);
        setUsers([]);
        setTransactions([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleAddUser = async () => {
    if (!newUser.trim()) return;
    const updatedUsers = [...users, newUser];
    await updateDoc(userRef, { users: updatedUsers });
    setNewUser("");
  };

  const handleAddTransaction = async (person) => {
    if (!amount) return;

    const newTransaction = {
      amount: Number(amount),
      note,
      paidBy: payer,
      user: person,
      date: new Date().toLocaleString(),
    };

    const updated = [...transactions, newTransaction];
    await updateDoc(userRef, { transactions: updated });
    setAmount("");
    setNote("");
  };

  const handleDeleteTransaction = async (index) => {
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) return;
    const updated = [...transactions];
    updated.splice(index, 1);
    await updateDoc(userRef, { transactions: updated });
  };

  const handleDeleteDashboard = async (person) => {
    const confirmed = window.confirm(`Delete ${person}'s dashboard?`);
    if (!confirmed) return;

    const updatedUsers = users.filter((u) => u !== person);
    const updatedTransactions = transactions.filter((t) => t.user !== person);
    await updateDoc(userRef, {
      users: updatedUsers,
      transactions: updatedTransactions,
    });
  };

  const calculateBalance = (person) => {
    let total = 0;
    transactions.forEach((t) => {
      if (t.user === person) {
        total += t.paidBy === "Me" ? t.amount : -t.amount;
      }
    });
    return total;
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>
        {user
          ? `Welcome, ${user.displayName}`
          : "Login to Access Your Expense Tracker"}
      </h2>

      {!user ? (
        <button onClick={handleLogin} style={{ marginTop: 20 }}>
          Login with Google
        </button>
      ) : (
        <>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "crimson",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "5px",
              float: "right",
            }}
          >
            Logout
          </button>

          <div style={{ marginTop: 30 }}>
            <h3>Add User</h3>
            <input
              type="text"
              placeholder="Enter user name"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              style={{ marginRight: 10 }}
            />
            <button onClick={handleAddUser}>Add</button>
          </div>

          <div style={{ marginTop: 30 }}>
            <h3>Total Summary</h3>
            {users.length === 0 ? (
              <p>No users added</p>
            ) : (
              <>
                {users.reduce((total, u) => total + calculateBalance(u), 0) === 0 ? (
                  <p><strong>All settled up</strong></p>
                ) : (
                  <p>
                    You will{" "}
                    {users.reduce((total, u) => total + calculateBalance(u), 0) > 0
                      ? "get"
                      : "give"}{" "}
                    $
                    {Math.abs(
                      users.reduce((total, u) => total + calculateBalance(u), 0)
                    )}
                  </p>
                )}
              </>
            )}
          </div>

          {users.map((person, idx) => {
            const balance = calculateBalance(person);
            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #ddd",
                  padding: "1rem",
                  marginTop: "2rem",
                }}
              >
                <h3>{person}'s Dashboard</h3>
                <p>
                  <strong>Balance:</strong>{" "}
                  {balance === 0 ? (
                    "All settled"
                  ) : balance > 0 ? (
                    <span style={{ color: "green" }}>{person} owes you ${balance}</span>
                  ) : (
                    <span style={{ color: "red" }}>You owe {person} ${-balance}</span>
                  )}
                </p>

                <div style={{ marginBottom: 10 }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ marginRight: 5 }}
                  />
                  <select
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    style={{ marginRight: 5 }}
                  >
                    <option value="Me">Me</option>
                    <option value={person}>{person}</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ marginRight: 5 }}
                  />
                  <button onClick={() => handleAddTransaction(person)}>Add</button>
                </div>

                <h4>Transactions</h4>
                <ul>
                  {transactions
                    .map((t, i) => ({ ...t, id: i }))
                    .filter((t) => t.user === person)
                    .map((t) => (
                      <li key={t.id}>
                        You paid ${t.amount} {t.paidBy === "Me" ? `to ${t.user}` : `from ${t.user}`} <br />
                        Note: {t.note} — {t.date}
                        <br />
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          style={{
                            marginTop: 5,
                            marginBottom: 10,
                            backgroundColor: "crimson",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                          }}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                </ul>

                <button
                  onClick={() => handleDeleteDashboard(person)}
                  style={{
                    backgroundColor: "#ffa500",
                    color: "#000",
                    padding: "6px 14px",
                    borderRadius: 4,
                    border: "none",
                  }}
                >
                  Delete Dashboard
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default App;
