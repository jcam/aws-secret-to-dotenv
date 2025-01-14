import * as core from '@actions/core'
import { SecretsManager } from "aws-sdk";
import fs, { PathLike } from "fs";
import dotenv, { DotenvParseOutput } from "dotenv";

type SecretKey = string;
type SecretValue = string;
type Secret = { [key in SecretKey]: SecretValue }

const secretsManager = new SecretsManager({});

export const write = (key: SecretKey, value: SecretValue, to: PathLike) => {
    core.setSecret(value);
    core.exportVariable(key, value);

    let content: DotenvParseOutput = {[key]: value};
    if (fs.existsSync(to)) {
        content = {...dotenv.parse(fs.readFileSync(to)), ...content};
    }

    const envVars = Object.entries(content)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync(to, envVars);
};

export function run() {
    return secretsManager.getSecretValue({SecretId: core.getInput('secret')}).promise()
        .then(response => {
            const secretString = response.SecretString;
            if (!secretString) {
                core.warning(`${response.Name} has no secret values`);
                return;
            }

            const secret: Secret = JSON.parse(secretString);
            const envPath: string = core.getInput('envPath');
            const key: string | undefined = core.getInput('key');

            try {
                key
                    ? write(core.getInput('as') || key, secret[key], envPath)
                    : Object.entries(secret).forEach(([key, value]) => write(key, value, envPath));
            } catch (error: any) {
                core.setFailed(error);
            }
        })
        .catch(error => {
            core.setFailed(error);
        });
}

run();
