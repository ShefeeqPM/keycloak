import {
  AlertVariant,
  Badge,
  Button,
  ButtonVariant,
  PageSection,
  Tab,
  TabTitleText,
  ToolbarItem,
} from "@patternfly/react-core";
import { cellWidth, TableText } from "@patternfly/react-table";
import type ClientRepresentation from "keycloak-admin/lib/defs/clientRepresentation";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAlerts } from "../components/alert/Alerts";
import { useConfirmDialog } from "../components/confirm-dialog/ConfirmDialog";
import { formattedLinkTableCell } from "../components/external-link/FormattedLink";
import { KeycloakTabs } from "../components/keycloak-tabs/KeycloakTabs";
import { KeycloakDataTable } from "../components/table-toolbar/KeycloakDataTable";
import { ViewHeader } from "../components/view-header/ViewHeader";
import { useAdminClient } from "../context/auth/AdminClient";
import { useRealm } from "../context/realm-context/RealmContext";
import { emptyFormatter, exportClient, getBaseUrl } from "../util";
import { InitialAccessTokenList } from "./initial-access/InitialAccessTokenList";
import { toAddClient } from "./routes/AddClient";
import { toClient } from "./routes/Client";
import { toImportClient } from "./routes/ImportClient";

export const ClientsSection = () => {
  const { t } = useTranslation("clients");
  const { addAlert, addError } = useAlerts();

  const adminClient = useAdminClient();
  const { realm } = useRealm();
  const baseUrl = getBaseUrl(adminClient);

  const [key, setKey] = useState(0);
  const refresh = () => setKey(new Date().getTime());
  const [selectedClient, setSelectedClient] = useState<ClientRepresentation>();

  const loader = async (first?: number, max?: number, search?: string) => {
    const params: { [name: string]: string | number } = {
      first: first!,
      max: max!,
    };
    if (search) {
      params.clientId = search;
      params.search = "true";
    }
    return await adminClient.clients.find({ ...params });
  };

  const [toggleDeleteDialog, DeleteConfirm] = useConfirmDialog({
    titleKey: t("clientDelete", { clientId: selectedClient?.clientId }),
    messageKey: "clients:clientDeleteConfirm",
    continueButtonLabel: "common:delete",
    continueButtonVariant: ButtonVariant.danger,
    onConfirm: async () => {
      try {
        await adminClient.clients.del({
          id: selectedClient!.id!,
        });
        addAlert(t("clientDeletedSuccess"), AlertVariant.success);
        refresh();
      } catch (error) {
        addError("client:clientDeleteError", error);
      }
    },
  });

  const ClientDetailLink = (client: ClientRepresentation) => (
    <>
      <Link
        key={client.id}
        to={toClient({ realm, clientId: client.id!, tab: "settings" })}
      >
        {client.clientId}
        {!client.enabled && (
          <Badge key={`${client.id}-disabled`} isRead className="pf-u-ml-sm">
            {t("common:disabled")}
          </Badge>
        )}
      </Link>
    </>
  );

  const ClientDescription = (client: ClientRepresentation) => (
    <>
      <TableText wrapModifier="truncate">
        {emptyFormatter()(client.description)}
      </TableText>
    </>
  );

  return (
    <>
      <ViewHeader
        titleKey="clients:clientList"
        subKey="clients:clientsExplain"
        divider={false}
      />
      <PageSection variant="light" className="pf-u-p-0">
        <KeycloakTabs isBox>
          <Tab
            data-testid="list"
            eventKey="list"
            title={<TabTitleText>{t("clientsList")}</TabTitleText>}
          >
            <DeleteConfirm />
            <KeycloakDataTable
              key={key}
              emptyState={<> </>}
              loader={loader}
              isPaginated
              ariaLabelKey="clients:clientList"
              searchPlaceholderKey="clients:searchForClient"
              toolbarItem={
                <>
                  <ToolbarItem>
                    {/* @ts-ignore */}
                    <Button component={Link} to={toAddClient({ realm })}>
                      {t("createClient")}
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      component={Link}
                      // @ts-ignore
                      to={toImportClient({ realm })}
                      variant="link"
                    >
                      {t("importClient")}
                    </Button>
                  </ToolbarItem>
                </>
              }
              actions={[
                {
                  title: t("common:export"),
                  onRowClick: (client) => {
                    exportClient(client);
                  },
                },
                {
                  title: t("common:delete"),
                  onRowClick: (client) => {
                    setSelectedClient(client);
                    toggleDeleteDialog();
                  },
                },
              ]}
              columns={[
                {
                  name: "clientId",
                  displayKey: "common:clientId",
                  cellRenderer: ClientDetailLink,
                },
                { name: "protocol", displayKey: "common:type" },
                {
                  name: "description",
                  displayKey: "common:description",
                  transforms: [cellWidth(20)],
                  cellRenderer: ClientDescription,
                },
                {
                  name: "baseUrl",
                  displayKey: "clients:homeURL",
                  cellFormatters: [formattedLinkTableCell(), emptyFormatter()],
                  cellRenderer: (client) => {
                    if (client.rootUrl) {
                      if (
                        !client.rootUrl.startsWith("http") ||
                        client.rootUrl.includes("$")
                      ) {
                        client.rootUrl =
                          client.rootUrl
                            .replace("${authBaseUrl}", baseUrl)
                            .replace("${authAdminUrl}", baseUrl) +
                          (client.baseUrl ? client.baseUrl.substr(1) : "");
                      }
                    }
                    return client.rootUrl;
                  },
                },
              ]}
            />
          </Tab>
          <Tab
            data-testid="initialAccessToken"
            eventKey="initialAccessToken"
            title={<TabTitleText>{t("initialAccessToken")}</TabTitleText>}
          >
            <InitialAccessTokenList />
          </Tab>
        </KeycloakTabs>
      </PageSection>
    </>
  );
};
