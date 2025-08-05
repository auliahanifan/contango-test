# CV Verifier

This is a full-stack web app that lets a user submit personal details and a PDF CV, then uses an AI validator to confirm that the typed data matches the PDF.

## Tech Stack

- [Next.js](https://nextjs.org)
- [tRPC](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
- [OpenAI](https://openai.com/)

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/en/)
- An [OpenAI API Key](https://platform.openai.com/account/api-keys)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Set up environment variables:**

    Create a `.env` file in the root of the project and add your OpenAI API key:

    ```
    OPENAI_API_KEY=your-openai-api-key
    ```

3.  **Build and run the application:**

    ```bash
    docker-compose up --build -d
    ```

4.  **Open the application:**

    The application will be available at [http://localhost:3000](http://localhost:3000).

## How it works

1.  The user fills out a form with their personal details and uploads a CV in PDF format.
2.  The Next.js application saves the PDF to a local volume and the metadata to a PostgreSQL database.
3.  The tRPC mutation immediately processes the CV validation inline using OpenAI.
4.  The OpenAI integration compares the data from the form with the content of the PDF.
5.  The validation result is immediately stored in the database and emitted via events.
6.  The frontend uses a tRPC subscription to display the validation status in real-time.
