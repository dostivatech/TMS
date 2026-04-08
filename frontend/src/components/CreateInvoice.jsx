import React, { forwardRef } from "react";

const Invoice = forwardRef(({ customer, transaction }, ref) => {
  return (
    <div ref={ref} style={{ padding: "20px", width: "300px" }}>
      <h2>TMS</h2>

      <p><strong>Customer:</strong> {customer.name}</p>
      <p><strong>Phone:</strong> {customer.phone}</p>
      <p><strong>Date:</strong> {transaction.date}</p>

      <hr />

      <p><strong>Type:</strong> {transaction.type}</p>
      <p><strong>Amount:</strong> ₹{transaction.amount}</p>

      <hr />

      <h3>Total: ₹{transaction.amount}</h3>

      <p style={{ marginTop: "40px" }}>Signature</p>
    </div>
  );
});

export default Invoice;