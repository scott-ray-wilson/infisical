import axios from 'axios';
import * as Sentry from '@sentry/node';
import { Octokit } from '@octokit/rest';
import sodium from 'libsodium-wrappers';
import { IIntegration, IIntegrationAuth } from '../models';
import {
  INTEGRATION_AZURE_KEY_VAULT,
  INTEGRATION_HEROKU,
  INTEGRATION_VERCEL,
  INTEGRATION_NETLIFY,
  INTEGRATION_GITHUB,
  INTEGRATION_RENDER,
  INTEGRATION_FLYIO,
  INTEGRATION_HEROKU_API_URL,
  INTEGRATION_VERCEL_API_URL,
  INTEGRATION_NETLIFY_API_URL,
  INTEGRATION_RENDER_API_URL,
  INTEGRATION_FLYIO_API_URL
} from '../variables';

/**
 * Sync/push [secrets] to [app] in integration named [integration]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {IIntegrationAuth} obj.integrationAuth - integration auth details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {String} obj.accessToken - access token for integration
 */
const syncSecrets = async ({
  integration,
  integrationAuth,
  secrets,
  accessToken
}: {
  integration: IIntegration;
  integrationAuth: IIntegrationAuth;
  secrets: any;
  accessToken: string;
}) => {
  try {
    switch (integration.integration) {
      case INTEGRATION_AZURE_KEY_VAULT:
        await syncSecretsAzureKeyVault({
          integration,
          secrets,
          accessToken
        });
        break;
      case INTEGRATION_HEROKU:
        await syncSecretsHeroku({
          integration,
          secrets,
          accessToken
        });
        break;
      case INTEGRATION_VERCEL:
        await syncSecretsVercel({
          integration,
          integrationAuth,
          secrets,
          accessToken
        });
        break;
      case INTEGRATION_NETLIFY:
        await syncSecretsNetlify({
          integration,
          integrationAuth,
          secrets,
          accessToken
        });
        break;
      case INTEGRATION_GITHUB:
        await syncSecretsGitHub({
          integration,
          secrets,
          accessToken
        });
        break;
      case INTEGRATION_RENDER:
        await syncSecretsRender({
          integration,
          secrets,
          accessToken
        });
        break;
      case INTEGRATION_FLYIO:
        await syncSecretsFlyio({
          integration,
          secrets,
          accessToken
        });
        break;
    }
  } catch (err) {
    Sentry.setUser(null);
    Sentry.captureException(err);
    throw new Error('Failed to sync secrets to integration');
  }
};

/**
 * Sync/push [secrets] to Azure Key Vault with vault URI [integration.app]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {String} obj.accessToken - access token for Azure Key Vault integration
 */
const syncSecretsAzureKeyVault = async ({
  integration,
  secrets,
  accessToken
}: {
  integration: IIntegration;
  secrets: any;
  accessToken: string;
}) => {
  try {

    interface GetAzureKeyVaultSecret {
      id: string; // secret URI
      attributes: {
        enabled: true,
        created: number;
        updated: number;
        recoveryLevel: string;
        recoverableDays: number;
      }
    }
    
    interface AzureKeyVaultSecret extends GetAzureKeyVaultSecret {
      key: string;
    }
    
    /**
     * Return all secrets from Azure Key Vault by paginating through URL [url]
     * @param {String} url - pagination URL to get next set of secrets from Azure Key Vault
     * @returns 
     */
    const paginateAzureKeyVaultSecrets = async (url: string) => {
      let result: GetAzureKeyVaultSecret[] = [];
      
      while (url) {
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        result = result.concat(res.data.value);
        url = res.data.nextLink;
      }
      
      return result;
    }
    
    const getAzureKeyVaultSecrets = await paginateAzureKeyVaultSecrets(`${integration.app}/secrets?api-version=7.3`);
    
    let lastSlashIndex: number;
    const res = (await Promise.all(getAzureKeyVaultSecrets.map(async (getAzureKeyVaultSecret) => {
      if (!lastSlashIndex) {
        lastSlashIndex = getAzureKeyVaultSecret.id.lastIndexOf('/');
      }
      
      const azureKeyVaultSecret = await axios.get(`${getAzureKeyVaultSecret.id}?api-version=7.3`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return ({
        ...azureKeyVaultSecret.data,
        key: getAzureKeyVaultSecret.id.substring(lastSlashIndex + 1),
      });
    })))
    .reduce((obj: any, secret: any) => ({
        ...obj,
        [secret.key]: secret
    }), {});
    
    const setSecrets: {
      key: string;
      value: string;
    }[] = [];

    Object.keys(secrets).forEach((key) => {
      const hyphenatedKey = key.replace(/_/g, '-');
      if (!(hyphenatedKey in res)) {
        // case: secret has been created
        setSecrets.push({
          key: hyphenatedKey,
          value: secrets[key]
        });
      } else {
        if (secrets[key] !== res[hyphenatedKey].value) {
          // case: secret has been updated
          setSecrets.push({
            key: hyphenatedKey,
            value: secrets[key]
          });
        }
      }
    });
    
    const deleteSecrets: AzureKeyVaultSecret[] = [];
    
    Object.keys(res).forEach((key) => {
      const underscoredKey = key.replace(/-/g, '_');
      if (!(underscoredKey in secrets)) {
        deleteSecrets.push(res[key]);
      }
    });
    
    // Sync/push set secrets
    if (setSecrets.length > 0) {
      setSecrets.forEach(async ({ key, value }) => {
        await axios.put(
          `${integration.app}/secrets/${key}?api-version=7.3`,
          {
            value
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
      });
    }
    
    if (deleteSecrets.length > 0) {
      deleteSecrets.forEach(async (secret) => {
        await axios.delete(`${integration.app}/secrets/${secret.key}?api-version=7.3`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      });
    }
  } catch (err) {
    Sentry.setUser(null);
    Sentry.captureException(err);
    throw new Error('Failed to sync secrets to Azure Key Vault');
  }
};

/**
 * Sync/push [secrets] to Heroku app named [integration.app]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {String} obj.accessToken - access token for Heroku integration
 */
const syncSecretsHeroku = async ({
  integration,
  secrets,
  accessToken
}: {
  integration: IIntegration;
  secrets: any;
  accessToken: string;
}) => {
  try {
    const herokuSecrets = (
      await axios.get(
        `${INTEGRATION_HEROKU_API_URL}/apps/${integration.app}/config-vars`,
        {
          headers: {
            Accept: 'application/vnd.heroku+json; version=3',
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
    ).data;

    Object.keys(herokuSecrets).forEach((key) => {
      if (!(key in secrets)) {
        secrets[key] = null;
      }
    });

    await axios.patch(
      `${INTEGRATION_HEROKU_API_URL}/apps/${integration.app}/config-vars`,
      secrets,
      {
        headers: {
          Accept: 'application/vnd.heroku+json; version=3',
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
  } catch (err) {
    Sentry.setUser(null);
    Sentry.captureException(err);
    throw new Error('Failed to sync secrets to Heroku');
  }
};

/**
 * Sync/push [secrets] to Vercel project named [integration.app]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 */
const syncSecretsVercel = async ({
    integration,
    integrationAuth,
    secrets,
    accessToken
}: {
    integration: IIntegration,
    integrationAuth: IIntegrationAuth,
    secrets: any;
    accessToken: string;
}) => {
    interface VercelSecret {
        id?: string;
        type: string;
        key: string;
        value: string;
        target: string[];
    }
    
    try {
      // Get all (decrypted) secrets back from Vercel in
      // decrypted format
      const params: { [key: string]: string } = {
        decrypt: 'true',
        ...( integrationAuth?.teamId ? { 
          teamId: integrationAuth.teamId
        } : {})   
      }
      
      const res = (await Promise.all((await axios.get(
          `${INTEGRATION_VERCEL_API_URL}/v9/projects/${integration.app}/env`, 
          {
              params,
              headers: {
                  Authorization: `Bearer ${accessToken}`
              }
          }
      ))
      .data
      .envs
      .filter((secret: VercelSecret) => secret.target.includes(integration.targetEnvironment))
      .map(async (secret: VercelSecret) => (await axios.get(
              `${INTEGRATION_VERCEL_API_URL}/v9/projects/${integration.app}/env/${secret.id}`,
              {
                params,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
              }
          )).data)
      )).reduce((obj: any, secret: any) => ({
          ...obj,
          [secret.key]: secret
      }), {});

      const updateSecrets: VercelSecret[] = [];
      const deleteSecrets: VercelSecret[] = [];
      const newSecrets: VercelSecret[] = [];

      // Identify secrets to create
      Object.keys(secrets).map((key) => {
          if (!(key in res)) {
              // case: secret has been created
              newSecrets.push({
                  key: key,
                  value: secrets[key],
                  type: 'encrypted',
                  target: [integration.targetEnvironment]
              });
          }
      });
      
      // Identify secrets to update and delete
      Object.keys(res).map((key) => {
          if (key in secrets) {
              if (res[key].value !== secrets[key]) {
                  // case: secret value has changed
                  updateSecrets.push({
                      id: res[key].id,
                      key: key,
                      value: secrets[key],
                      type: 'encrypted',
                      target: [integration.targetEnvironment]
                  });
              }
          } else {
              // case: secret has been deleted
              deleteSecrets.push({
                  id: res[key].id,
                  key: key,
                  value: res[key].value,
                  type: 'encrypted',
                  target: [integration.targetEnvironment],
              });
          }
      });

      // Sync/push new secrets
      if (newSecrets.length > 0) {
          await axios.post(
              `${INTEGRATION_VERCEL_API_URL}/v10/projects/${integration.app}/env`,
              newSecrets,
              {
                params,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
              }
          );
      }

      // Sync/push updated secrets
      if (updateSecrets.length > 0) {
          updateSecrets.forEach(async (secret: VercelSecret) => {
              const { 
                  id, 
                  ...updatedSecret 
              } = secret;
              await axios.patch(
                  `${INTEGRATION_VERCEL_API_URL}/v9/projects/${integration.app}/env/${secret.id}`,
                  updatedSecret,
                  {
                    params,
                    headers: {
                        Authorization: `Bearer ${accessToken}` 
                    }
                  }
              );
          });
      }

      // Delete secrets
      if (deleteSecrets.length > 0) {
          deleteSecrets.forEach(async (secret: VercelSecret) => {
              await axios.delete(
                  `${INTEGRATION_VERCEL_API_URL}/v9/projects/${integration.app}/env/${secret.id}`,
                  {
                    params,
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                  }
              );
          });
      }
    } catch (err) {
      Sentry.setUser(null);
      Sentry.captureException(err);
      throw new Error('Failed to sync secrets to Vercel');
    }
}

/**
 * Sync/push [secrets] to Netlify site with id [integration.appId]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {IIntegrationAuth} obj.integrationAuth - integration auth details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {Object} obj.accessToken - access token for Netlify integration
 */
const syncSecretsNetlify = async ({
    integration,
    integrationAuth,
    secrets,
    accessToken
}: {
    integration: IIntegration;
    integrationAuth: IIntegrationAuth;
    secrets: any;
    accessToken: string;
}) => {
    try {

      interface NetlifyValue {
          id?: string;
          context: string; // 'dev' | 'branch-deploy' | 'deploy-preview' | 'production',
          value: string;
      }
      
      interface NetlifySecret {
          key: string;
          values: NetlifyValue[];
      }
      
      interface NetlifySecretsRes {
          [index: string]: NetlifySecret;
      }
      
      const getParams = new URLSearchParams({
          context_name: 'all', // integration.context or all
          site_id: integration.appId
      });
      
      const res = (await axios.get(
          `${INTEGRATION_NETLIFY_API_URL}/api/v1/accounts/${integrationAuth.accountId}/env`,
          {
              params: getParams,
              headers: {
                  Authorization: `Bearer ${accessToken}`
              }
          }
      ))
      .data
      .reduce((obj: any, secret: any) => ({
          ...obj,
          [secret.key]: secret
      }), {});
      
      const newSecrets: NetlifySecret[] = []; // createEnvVars
      const deleteSecrets: string[] = []; // deleteEnvVar
      const deleteSecretValues: NetlifySecret[] = []; // deleteEnvVarValue
      const updateSecrets: NetlifySecret[] = []; // setEnvVarValue
      
      // identify secrets to create and update
      Object.keys(secrets).map((key) => {
          if (!(key in res)) {
              // case: Infisical secret does not exist in Netlify -> create secret
              newSecrets.push({
                  key,
                  values: [{
                      value: secrets[key],
                      context: integration.targetEnvironment
                  }]
              });
          } else {
              // case: Infisical secret exists in Netlify
              const contexts = res[key].values
                  .reduce((obj: any, value: NetlifyValue) => ({
                      ...obj,
                      [value.context]: value
                  }), {});
              
              if (integration.targetEnvironment in contexts) {
                  // case: Netlify secret value exists in integration context
                  if (secrets[key] !== contexts[integration.targetEnvironment].value) {
                      // case: Infisical and Netlify secret values are different
                      // -> update Netlify secret context and value
                      updateSecrets.push({
                          key,
                          values: [{
                              context: integration.targetEnvironment,
                              value: secrets[key]
                          }]
                      });
                  }
              } else {
                  // case: Netlify secret value does not exist in integration context
                  // -> add the new Netlify secret context and value
                  updateSecrets.push({
                      key,
                      values: [{
                          context: integration.targetEnvironment,
                          value: secrets[key]
                      }]
                  });
              }
          }
      })
      
      // identify secrets to delete
      // TODO: revise (patch case where 1 context was deleted but others still there
      Object.keys(res).map((key) => {
          // loop through each key's context
          if (!(key in secrets)) {
              // case: Netlify secret does not exist in Infisical
              
              const numberOfValues = res[key].values.length;
              
              res[key].values.forEach((value: NetlifyValue) => {
                  if (value.context === integration.targetEnvironment) {
                      if (numberOfValues <= 1) {
                          // case: Netlify secret value has less than 1 context -> delete secret
                          deleteSecrets.push(key); 
                      } else {
                          // case: Netlify secret value has more than 1 context -> delete secret value context
                          deleteSecretValues.push({
                              key,
                              values: [{
                                  id: value.id,
                                  context: integration.targetEnvironment,
                                  value: value.value
                              }]
                          });
                      }
                  }
              });
          }
      });

      const syncParams = new URLSearchParams({
          site_id: integration.appId
      });

      if (newSecrets.length > 0) {
          await axios.post(
              `${INTEGRATION_NETLIFY_API_URL}/api/v1/accounts/${integrationAuth.accountId}/env`,
              newSecrets,
              {
                  params: syncParams,
                  headers: {
                      Authorization: `Bearer ${accessToken}`
                  }
              }
          );
      }

      if (updateSecrets.length > 0) {
          updateSecrets.forEach(async (secret: NetlifySecret) => {
              await axios.patch(
                  `${INTEGRATION_NETLIFY_API_URL}/api/v1/accounts/${integrationAuth.accountId}/env/${secret.key}`,
                  {
                      context: secret.values[0].context,
                      value: secret.values[0].value
                  },
                  {
                      params: syncParams,
                      headers: {
                          Authorization: `Bearer ${accessToken}` 
                      }
                  }
              );
          });
      }

      if (deleteSecrets.length > 0) {
          deleteSecrets.forEach(async (key: string) => {
              await axios.delete(
                  `${INTEGRATION_NETLIFY_API_URL}/api/v1/accounts/${integrationAuth.accountId}/env/${key}`,
                  {
                      params: syncParams,
                      headers: {
                          Authorization: `Bearer ${accessToken}`
                      }
                  }
              );
          });
      }

      if (deleteSecretValues.length > 0) {
          deleteSecretValues.forEach(async (secret: NetlifySecret) => {
              await axios.delete(
                  `${INTEGRATION_NETLIFY_API_URL}/api/v1/accounts/${integrationAuth.accountId}/env/${secret.key}/value/${secret.values[0].id}`,
                  {
                      params: syncParams,
                      headers: {
                          Authorization: `Bearer ${accessToken}`
                      }
                  }
              );
          });
      }
    } catch (err) {
      Sentry.setUser(null);
      Sentry.captureException(err);
      throw new Error('Failed to sync secrets to Heroku');
    }
}

/**
 * Sync/push [secrets] to GitHub repo with name [integration.app]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {IIntegrationAuth} obj.integrationAuth - integration auth details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {String} obj.accessToken - access token for GitHub integration 
 */
const syncSecretsGitHub = async ({
  integration,
  secrets,
  accessToken
}: {
  integration: IIntegration;
  secrets: any;
  accessToken: string;
}) => {
  try {
    
    interface GitHubRepoKey {
      key_id: string;
      key: string;
    }
    
    interface GitHubSecret {
      name: string;
      created_at: string;
      updated_at: string;
    }

    interface GitHubSecretRes {
        [index: string]: GitHubSecret;
    }

    const deleteSecrets: GitHubSecret[] = [];

    const octokit = new Octokit({
      auth: accessToken
    });

    // const user = (await octokit.request('GET /user', {})).data;
    const repoPublicKey: GitHubRepoKey = (await octokit.request(
      'GET /repos/{owner}/{repo}/actions/secrets/public-key',
      {
        owner: integration.owner,
        repo: integration.app
      }
    )).data;

    // Get local copy of decrypted secrets. We cannot decrypt them as we dont have access to GH private key
    const encryptedSecrets: GitHubSecretRes = (await octokit.request(
      'GET /repos/{owner}/{repo}/actions/secrets',
      {
        owner: integration.owner,
        repo: integration.app
      }
    ))
    .data
    .secrets
    .reduce((obj: any, secret: any) => ({
      ...obj,
      [secret.name]: secret
    }), {});
    
    Object.keys(encryptedSecrets).map(async (key) => {
      if (!(key in secrets)) {
        await octokit.request(
          'DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}',
          {
            owner: integration.owner,
            repo: integration.app,
            secret_name: key
          }
        );
      }
    });
    
    Object.keys(secrets).map((key) => {
      // let encryptedSecret;
      sodium.ready.then(async () => {
          // convert secret & base64 key to Uint8Array.
          const binkey = sodium.from_base64(
            repoPublicKey.key,
            sodium.base64_variants.ORIGINAL
          );
          const binsec = sodium.from_string(secrets[key]);

          // encrypt secret using libsodium
          const encBytes = sodium.crypto_box_seal(binsec, binkey);

          // convert encrypted Uint8Array to base64
          const encryptedSecret = sodium.to_base64(
            encBytes,
            sodium.base64_variants.ORIGINAL
          );
          
          await octokit.request(
            'PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}',
            {
              owner: integration.owner,
              repo: integration.app,
              secret_name: key,
              encrypted_value: encryptedSecret,
              key_id: repoPublicKey.key_id
            }
          );
      });
    });
  } catch (err) {
    Sentry.setUser(null);
    Sentry.captureException(err);
    throw new Error('Failed to sync secrets to GitHub');
  }
};

/**
 * Sync/push [secrets] to Render service with id [integration.appId]
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {String} obj.accessToken - access token for Render integration
 */
const syncSecretsRender = async ({
  integration,
  secrets,
  accessToken
}: {
  integration: IIntegration;
  secrets: any;
  accessToken: string;
}) => {
  try {
    await axios.put(
      `${INTEGRATION_RENDER_API_URL}/v1/services/${integration.appId}/env-vars`,
      Object.keys(secrets).map((key) => ({
        key,
        value: secrets[key]
      })),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
  } catch (err) {
    Sentry.setUser(null);
    Sentry.captureException(err);
    throw new Error('Failed to sync secrets to Render');
  }
}

/**
 * Sync/push [secrets] to Fly.io app
 * @param {Object} obj
 * @param {IIntegration} obj.integration - integration details
 * @param {Object} obj.secrets - secrets to push to integration (object where keys are secret keys and values are secret values)
 * @param {String} obj.accessToken - access token for Render integration
 */
const syncSecretsFlyio = async ({
  integration,
  secrets,
  accessToken
}: {
  integration: IIntegration;
  secrets: any;
  accessToken: string;
}) => {
  try {
    // set secrets
    const SetSecrets = `
      mutation($input: SetSecretsInput!) {
        setSecrets(input: $input) {
          release {
            id
            version
            reason
            description
            user {
              id
              email
              name
            }
            evaluationId
            createdAt
          }
        }
      }
    `;

    await axios({
      url: INTEGRATION_FLYIO_API_URL,
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
      data: {
        query: SetSecrets,
        variables: {
          input: {
            appId: integration.app,
            secrets: Object.entries(secrets).map(([key, value]) => ({ key, value }))
          }
        }
      }
    });
    
    // get secrets
    interface FlyioSecret {
      name: string;
      digest: string;
      createdAt: string;
    }
    
    const GetSecrets = `query ($appName: String!) {
        app(name: $appName) {
            secrets {
                name
                digest
                createdAt
            }
        }
    }`;

    const getSecretsRes = (await axios({
        method: 'post',
        url: INTEGRATION_FLYIO_API_URL,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'application/json'
        },
        data: {
          query: GetSecrets,
          variables: {
            appName: integration.app
          }
        }
    })).data.data.app.secrets;
    
    const deleteSecretsKeys = getSecretsRes
      .filter((secret: FlyioSecret) => !(secret.name in secrets))
      .map((secret: FlyioSecret) => secret.name);
    
    // unset (delete) secrets
    const DeleteSecrets = `mutation($input: UnsetSecretsInput!) {
        unsetSecrets(input: $input) {
            release {
                id
                version
                reason
                description
                user {
                    id
                    email
                    name
                }
                evaluationId
                createdAt
            }
        }
    }`;

    await axios({
        method: 'post',
        url: INTEGRATION_FLYIO_API_URL,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        data: {
          query: DeleteSecrets,
          variables: {
            input: {
              appId: integration.app,
              keys: deleteSecretsKeys
            }
          }
        }
    });

  } catch (err) {
    Sentry.setUser(null);
    Sentry.captureException(err);
    throw new Error('Failed to sync secrets to Fly.io');
  }
}

export { syncSecrets };