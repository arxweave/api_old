# Arxeweave API

Placing [arxiv.org](https://arxiv.org/) on the [permaweb](https://www.arweave.org/).

### Getting Started
1. Setup up aws credentials
  Create file: ~/.aws/credentials
    ```
      [default]
      aws_access_key_id = <KEY_ID>
      aws_secret_access_key = <KEY_SECRET>
    ```
2. Setup up keyfile with the servers Arweave wallet
  Create a keystore file eg. ~/.arweave/jwk.json. We fetch th path from the `.env` file (see step 3) so you can place it anywhere you want.
    ```
    {
      "kty": "RSA",
      "ext": true,
      "e": "...",
      "n": "...",
      "d": "...",
      "p": "...",
      "q": "...",
      "dp": "...",
      "dq": "...",
      "qi": "..."
      }

    ```
3. Clone the `.env.example`, rename to `.env`, and set `JWK_PATH` to the full path of the keystore file.
    ```zsh
      cp .env.example .env
    ```


4. Launch
  ```zsh
    yarn && yarn start
  ```
