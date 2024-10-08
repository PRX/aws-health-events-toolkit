import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import accountName from "./accounts.mjs";

const eventbridge = new EventBridgeClient({ apiVersion: "2015-10-07" });

const GREEN = "#2eb886";
const RED = "#a30200";

function timeSince(date) {
  const seconds = Math.floor((+new Date() - date) / 1000);

  let interval = seconds / 86400;
  if (interval > 1) {
    return `${Math.floor(interval)} days`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return `${Math.floor(interval)} hours`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    return `${Math.floor(interval)} minutes`;
  }
  return `${Math.floor(seconds)} seconds`;
}

export const handler = async (event) => {
  console.log(
    JSON.stringify({
      msg: "Input event",
      event,
    }),
  );

  const accountId = event.detail.affectedAccount;
  const region = event.detail.eventRegion;
  const { service } = event.detail;
  const code = event.detail.eventTypeCode;
  const category = event.detail.eventTypeCategory;
  const scope = event.detail.eventScopeCode;
  const startTs = Date.parse(event.detail.startTime);
  const status = event.detail.statusCode;
  const description = event.detail.eventDescription[0].latestDescription;

  if (scope === "PUBLIC" && category === "issue") {
    const color = status === "closed" ? GREEN : RED;

    await eventbridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "org.prx.health-events",
            DetailType: "Slack Message Relay Message Payload",
            Detail: JSON.stringify({
              username: "AWS Health Events",
              icon_emoji: ":ops-aws-health:",
              channel: "C07P8SWQ3K4", // #ops-aws-health
              attachments: [
                {
                  color,
                  fallback: event.detail.eventTypeCode,
                  blocks: [
                    {
                      type: "section",
                      text: {
                        type: "mrkdwn",
                        text: [
                          `*Service:* ${service}`,
                          `*Region:* ${region}`,
                          `*Account:* ${accountName(accountId)}`,
                          `*Event Code:* ${code}`,
                          "\n",
                          `*Started:* ${timeSince(new Date(startTs))} ago`,
                          "\n",
                          description,
                        ].join("\n"),
                      },
                    },
                  ],
                },
              ],
            }),
          },
        ],
      }),
    );
  }
};
