# Use a modular monolith and immutable edition snapshots

The system uses a TypeScript modular monolith backed by PostgreSQL, with explicit Module interfaces and adapters only for dependencies that genuinely vary. Public pages render immutable Published Edition snapshots rather than mutable editorial tables, keeping publication atomic and auditable without the operational cost and consistency failure modes of premature microservices.
