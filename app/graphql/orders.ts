// ─── GraphQL Queries & Mutations for Orders ───

export const ORDER_QUERY = `#graphql
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      name
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      customer {
        id
        tags
        email
      }
      shippingAddress {
        countryCode
      }
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            variant {
              id
              price
              product {
                id
                handle
                collections(first: 10) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const ORDER_EDIT_BEGIN = `#graphql
  mutation orderEditBegin($id: ID!) {
    orderEditBegin(id: $id) {
      calculatedOrder {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ORDER_EDIT_ADD_VARIANT = `#graphql
  mutation orderEditAddVariant($id: ID!, $variantId: ID!, $quantity: Int!) {
    orderEditAddVariant(id: $id, variantId: $variantId, quantity: $quantity) {
      calculatedOrder {
        id
        addedLineItems(first: 10) {
          edges {
            node {
              id
              title
              quantity
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ORDER_EDIT_COMMIT = `#graphql
  mutation orderEditCommit($id: ID!) {
    orderEditCommit(id: $id) {
      order {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
