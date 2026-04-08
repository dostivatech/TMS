import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const CustomerDetails = () => {
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    axios.get(`/api/customers/${id}`)
      .then(res => {
        setCustomer(res.data.customer);
        setTransactions(res.data.transactions);
      });
  }, [id]);

  if (!customer) return <p>Loading...</p>;

  return (
    <div>
      <h2>{customer.name}</h2>
      <p>Phone: {customer.phone}</p>
      <p>Address: {customer.address}</p>
      <p>Balance: ₹{customer.balance}</p>

      <h3>Transactions</h3>
      <ul>
        {transactions.map(tx => (
          <li key={tx.id}>
            {tx.type} - ₹{tx.amount} ({tx.date})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomerDetails;