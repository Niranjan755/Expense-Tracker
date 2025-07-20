import React, { useState, useEffect } from "react";
import { db, auth, provider } from "./firebase";
import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

export default function ExpenseTracker() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newUser, setNewUser] = useState("");
  const [form, setForm] = useState({});
  const [user, setUser] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false); // ✅ NEW

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const docRef = doc(db, "expenses", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsers(data.users || []);
        setTransactions(data.transactions || []);
      }
      setInitialLoaded(true); // ✅ Data loaded
    };
    fetchData();
  }, [user]);

  // Save to Firestore ONLY after data is fetched
  useEffect(() => {
    if (!user || !initialLoaded) return; // ✅ Block premature save
    const saveData = async () => {
      await setDoc(doc(db, "expenses", user.uid), {
        users,
        transactions
      });
    };
    saveData();
  }, [users, transactions, user, initialLoaded]);

  const handleLogin = () => signInWithPopup(auth, provider).catch(console.error);
  const handleLogout = () => signOut(auth);

  const addUser = () => {
    if (newUser && !users.includes(newUser)) {
      setUsers([...users, newUser]);
      setForm({ ...form, [newUser]: { amount: "", paidBy: "Me", note: "" } });
      setNewUser("");
    }
  };

  const addTransaction = (user) => {
    const { amount, paidBy, note } = form[user];
    if (user && amount && paidBy) {
      setTransactions([
        ...transactions,
        {
          user,
          amount: parseFloat(amount),
          paidBy,
          note,
          date: new Date().toLocaleString()
        }
      ]);
      setForm({ ...form, [user]: { amount: "", paidBy: "Me", note: "" } });
    }
  };

  const deleteTransaction = (index) => {
    const updated = [...transactions];
    updated.splice(index, 1);
    setTransactions(updated);
  };

  const calculateBalance = (user) => {
    let balance = 0;
    transactions.forEach(({ user: txUser, amount, paidBy }) => {
      if (txUser === user) {
        balance += paidBy === "Me" ? amount : -amount;
      }
    });
    return balance;
  };

  const getUserTransactions = (user) => {
    return transactions.filter((tx) => tx.user === user);
  };

  const calculateTotalBalance = () => {
    return users.reduce((acc, user) => acc + calculateBalance(user), 0);
  };

  const balanceTextStyle = (balance) => ({
    color: balance > 0 ? "green" : balance < 0 ? "red" : "black",
    fontWeight: "bold"
  });

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      {!user ? (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>Login to Access Your Expense Tracker</h2>
          <button onClick={handleLogin} style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>
            Login with Google
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2>Welcome, {user.displayName}</h2>
            <button onClick={handleLogout} style={{ padding: "8px 12px", borderRadius: "4px", backgroundColor: "#dc3545", color: "white", border: "none" }}>
              Logout
            </button>
          </div>

          <div style={cardStyle}>
            <h2>Add User</h2>
            <input
              type="text"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="Enter user name"
              style={inputStyle}
            />
            <button onClick={addUser} style={buttonStyle}>Add</button>
          </div>

          <div style={cardStyle}>
            <h2>Total Summary</h2>
            <p style={balanceTextStyle(calculateTotalBalance())}>
              {calculateTotalBalance() === 0
                ? "All settled up"
                : calculateTotalBalance() > 0
                ? `You will get $${calculateTotalBalance()}`
                : `You need to pay $${-calculateTotalBalance()}`}
            </p>
          </div>

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

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
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
                    style={inputStyle}
                  >
                    <option value="Me">Me</option>
                    <option value="Other">{user}</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Note"
                    value={form[user]?.note || ""}
                    onChange={(e) => setForm({ ...form, [user]: { ...form[user], note: e.target.value } })}
                    style={inputStyle}
                  />
                  <button onClick={() => addTransaction(user)} style={buttonStyle}>Add</button>
                </div>

                <div>
                  <h3>Transactions</h3>
                  {getUserTransactions(user).map((tx, txIdx) => (
                    <div key={txIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <span>
                        {tx.paidBy === "Me" ? `You paid $${tx.amount} to ${user}` : `${user} paid $${tx.amount} to You`}<br />
                        <small>{tx.note && `Note: ${tx.note} — `}{tx.date}</small>
                      </span>
                      <button onClick={() => deleteTransaction(transactions.indexOf(tx))} style={{ ...buttonStyle, backgroundColor: "#dc3545" }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// Shared styles
const cardStyle = {
  border: "1px solid #ccc",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "20px",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
};

const inputStyle = {
  padding: "8px",
  marginRight: "10px",
  borderRadius: "4px",
  border: "1px solid #ccc"
};

const buttonStyle = {
  padding: "8px 12px",
  borderRadius: "4px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  cursor: "pointer"
};
