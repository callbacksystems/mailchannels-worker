# Mailchannels Worker

This is a Cloudflare Worker that acts as a proxy to send emails using the [Mailchannels API](https://api.mailchannels.net/tx/v1/documentation).

[Mailchannels has introduced](https://blog.cloudflare.com/sending-email-from-workers-with-mailchannels/) an API that enables email sending exclusively from authorized Cloudflare Workers. This API ensures that only Cloudflare Workers included in the specified DNS records can send emails, effectively preventing unauthorized access and maintaining secure email delivery. Therefore, to send emails from outside Cloudflare Workers you need an intermediary worker to do the job. This repository does just that.

This provides a much easier entry point for sending transactional emails, making it possible to bypass the verification processes of other email sending providers. It also offers significantly lower costs, since you only pay for the request made to the Cloudflare Worker. Currently, the free plan covers up to 100k requests per day, significantly more than any free plan from popular email sending providers. Additionally, sending at scale is still much cheaper.

## Deployment

You need to set up the required DNS Records, deploy the Worker, and configure the necessary environment variables.

### Setting up DNS Records

#### SPF Record

To authorize Mailchannels to send emails using your domain, set up an [SPF record](https://www.cloudflare.com/learning/dns/dns-records/dns-spf-record/).

1. In Cloudflare's Account Home, select the website you would like to add an SPF record for.
2. Select DNS > Records > Add Record.
3. Enter the SPF record below into your DNS server as a text (TXT) entry. This must be on the root (@) of the domain. (You currently cannot send mail from a subdomain.)

    ```
    v=spf1 include:_spf.mx.cloudflare.net include:relay.mailchannels.net -all
    ```

    Here is included the [Cloudflare Email routing](https://developers.cloudflare.com/email-routing/) as well.

#### DKIM Record

The MailChannels API allows you to add a [DomainKeys Identified Mail (DKIM)](https://www.cloudflare.com/en-ca/learning/dns/dns-records/dns-dkim-record/) credential to your DNS records, an email authentication standard.

Setting up DKIM is optional but improves email deliverability. You can generate DKIM credentials using OpenSSL:

1. Generate your private key and DNS record by running the command below in your terminal:

    ```bash
    $ openssl genrsa 2048 | tee private_key.pem | openssl rsa -outform der | openssl base64 -A > private_key.txt
    ```

    ```bash
    $ echo -n "v=DKIM1;p=" > dkim_record.txt && openssl rsa -in private_key.pem -pubout -outform der | openssl base64 -A >> dkim_record.txt
    ```

2. In Cloudflare's Account Home, select the website you would like to add a DKIM record.
3. In the menu on the left select DNS > Records > Add Record.
4. Enter the DKIM record into your DNS server as a text (TXT) entry. The name of your DNS record must be "mailchannels._domainkey".
5. Add the content of dkim_record.txt generated file in the content field.

#### Domain Lockdown

To prevent unauthorized email sending from your domain, enable [Domain Lockdown™](https://support.mailchannels.com/hc/en-us/articles/16918954360845-Secure-your-domain-name-against-spoofing-with-Domain-Lockdown-) via a DNS TXT record.

Follow these steps to enable Domain Lockdown™ for your domain:

1. In Cloudflare's Account Home, select the website you would like to add a Domain Lockdown.
2. In the menu on the left select DNS > Records > Add Record.
3. Enter the Domain Lockdown record into your DNS server as a text (TXT) entry. The name of your DNS record must be "_mailchannels".
4. Add "v=mc1 cfid=myapp.workers.dev" in the content field. Find your worker subdomain In Cloudflare dashboard > Workers & Pages on the right side of the overview page.

#### DMARC Record

[DMARC](https://www.cloudflare.com/learning/dns/dns-records/dns-dmarc-record/), along with other email authentication methods like DKIM and SPF, acts as a background check on email senders, ensuring they are legitimate and preventing email spoofing.

Setting up DMARC is optional but improves email deliverability. Follow these steps to enable it for your domain:

1. In Cloudflare's Account Home, select the website you would like to add a DMARC record.
2. In the menu on the left select DNS > Records > Add Record.
3. Enter the DMARC record below into your DNS server as a text (TXT) entry. The name of your DNS record must be "_dmarc".

    ```
    v=DMARC1; p=reject; rua=mailto:dmarc@example.com
    ```

    Adjust the email address in `rua` to where you wish to receive DMARC reports.

### Deploying to Cloudflare Workers

First, clone the repository:

    $ git clone https://github.com/ment-labs/mailchannels-worker

Ensure you have [Node.js](https://nodejs.org/en) installed and run `npm install`.

By default, the worker is named "mailchannels". This is a unique name per account that Cloudflare uses to identify each worker. The worker depends on three environment variables, so it only works for one domain per worker. If you want to deploy two workers in the same Cloudflare account, you must rename one of the workers before deploying it to avoid collisions. If you want to rename it, you can do it in the "wrangler.toml" file.

To deploy, run `npm run deploy`. This prompts you to log in with your Cloudflare account and deploy the worker.

#### Setting Environment Variables

1. Log in into the Cloudflare dashboard > Workers & Pages > your deployed worker > Settings > Environment Variables > Add variables.
2. Add the "DKIM_PRIVATE_KEY" environment variable generated in the previous step from the contents of the `private_key.txt` file.
3. Add the "API_KEY" environment variable. Generate one, for example using:

    ```bash
    $ openssl rand -hex 64
    ```

4. Add the "DOMAIN" environment variable, which is yor email sending domain.

## Usage

To interact with the API, you need to make a request to the deployed worker. Include the API Key generated earlier in the Authorization header, using the format "Bearer API_KEY".

You can read the API documentation [here](https://api.mailchannels.net/tx/v1/documentation). The worker will send all body parameters to Mailchannels. `dkim_domain`, `dkim_selector`, and `dkim_private_key` should not be sent within personalizations since the worker automatically adds them based on environment variables. The worker will respond with the same response returned by Mailchannels.
