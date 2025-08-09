# Shrimpy-alt: AI-Powered Professional Networking

Shrimpy-alt is a next-generation professional networking platform that leverages advanced AI to connect you with the most relevant people in your field. Unlike traditional platforms that rely on simple keyword matching, Shrimpy-alt uses a sophisticated multi-vector search engine to understand your intent and deliver highly personalized results.

## Key Features

- **AI-Powered Intent Analysis**: Shrimpy-alt analyzes your search queries to understand your underlying goals, whether you're looking for specific skills, experience, or company connections.
- **Multi-Vector Search**: We generate rich vector embeddings for user profiles across multiple dimensions, including skills, experience, education, and more. This enables a nuanced and context-aware search that goes beyond simple keyword matching.
- **Dynamic Weighting**: The platform uses smart weighting to prioritize the most relevant search criteria, ensuring you always see the best matches first.
- **Built with Next.js and Firebase**: A modern, scalable, and performant architecture using the best of the React ecosystem and Google's backend services.

## Architecture Overview

Shrimpy-alt is built on a modern serverless architecture that is designed for performance and scalability. The core components include:

- **Frontend**: A responsive and interactive user interface built with [Next.js](https://nextjs.org/) and [React](https://react.dev/).
- **Backend**: A set of serverless functions deployed on [Vercel](https://vercel.com/) that handle API requests, user authentication, and business logic.
- **AI Services**: We use [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) for our intent analysis and text embedding models.
- **Database**: User data and vector embeddings are stored in [Firestore](https://firebase.google.com/docs/firestore), a NoSQL document database that is part of the Firebase suite.
- **Vector Storage**: The vector embeddings are managed and queried through a custom `VectorStorage` module that is optimized for performance.

![Architectural Diagram](https://source.mermaid.live/svg/pako:eNqVVMtqwzAQ_JXXU0qfNkkbmoY3lEILhbahtxBJa2zFmGSrQtj77rWTNB3S8tpsd3Znx46eYkI1BwUeBTM4yA6B6dJ3-B7SDBHwO2_J5J2Yd8w0UaZ1Y9p9S7y9Xm5qfM_r11uP6_VbFzW01Gf2vK3vYkK5xQp9JjB15Q7Bf30V74w5qHCT6bF40-zYn6cI4z9zD962Ea5x0R-F0n_eJpS1cWwzRj0E1v7I8S9u9c9u4-1eT-jH-m_d-M5F2mQ6K6yR5XhHwJj1Wf-G7J3w8zB6p7wz7hD8l62h9SPl3_b4wWjJ4z-w_u3l-7cW-Xk_q2eN2-S7sVzF473H7E5v5bX1gU6_JdM4S04QJj2VzU4hR3mD_Y6rB0i6sQf-6Uj4gH7F1X38p2K4E9nN-v0Xw_9e8u)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/your_username/shrimpy-alt.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Set up your environment variables by creating a `.env.local` file in the root of the `shrimpy-alt` directory. You will need to add your Azure and Firebase credentials here.
    ```
    AZURE_RESOURCE_NAME=
    AZURE_OPENAI_API_KEY=
    AZURE_OPENAI_DEPLOYMENT_NAME=

    NEXT_PUBLIC_FIREBASE_API_KEY=
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
    NEXT_PUBLIC_FIREBASE_APP_ID=
    ```
4.  Run the development server
    ```sh
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
