// ─── GraphQL Queries & Mutations for Products ───

export const PRODUCTS_QUERY = `#graphql
  query getProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          id
          title
          handle
          status
          featuredMedia {
            preview {
              image {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                inventoryQuantity
              }
            }
          }
          collections(first: 5) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PRODUCT_BY_ID_QUERY = `#graphql
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      descriptionHtml
      featuredMedia {
        preview {
          image {
            url
            altText
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            price
            compareAtPrice
            inventoryQuantity
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const PRODUCTS_BY_IDS_QUERY = `#graphql
  query getProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        featuredMedia {
          preview {
            image {
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              price
              compareAtPrice
            }
          }
        }
      }
    }
  }
`;
