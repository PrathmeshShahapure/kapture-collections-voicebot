import { findCustomerById ,findCustomerByPhone,} from "../repositories/customer.repository.js";

export const getCustomerById = async (customerId) => {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;

    throw error;
  }

  return customer;
};

export const verifyCustomer = async (phone, accountLast4) => {
  const customer = await findCustomerByPhone(phone);

  if (!customer) {
    return {
      verified: false,
      reason: "CUSTOMER_NOT_FOUND",
    };
  }

  const storedLast4 = customer.account_number.slice(-4);

  if (storedLast4 !== accountLast4) {
    return {
      verified: false,
      reason: "INVALID_ACCOUNT_LAST4",
    };
  }

  return {
    verified: true,
    customerId: customer.id,
  };
};
