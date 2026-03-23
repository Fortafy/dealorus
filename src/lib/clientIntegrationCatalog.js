export const CLIENT_INTEGRATION_CATALOG = [
  {
    integration_type: "CharityAPI",
    display_name: "CharityAPI",
    description: "Use your own CharityAPI key for nonprofit enrichment.",
    help_url: "https://www.charityapi.org/",
    help_label: "Get CharityAPI key",
    requires_key: true
  },
  {
    integration_type: "ProPublica",
    display_name: "ProPublica",
    description: "ProPublica provides a a free API to the search engine and database that powers Nonprofit Explorer.",
    help_url: "https://projects.propublica.org/nonprofits/api",
    help_label: "View ProPublica API",
    requires_key: false
  },
  {
    integration_type: "NonprofitCheckPlus",
    display_name: "Nonprofit Check Plus",
    description: "Use your own Nonprofit Check Plus key for nonprofit verification.",
    help_url: "https://pactman.org/nonprofitcheckplus-api/docs",
    help_label: "Get Nonprofit Check Plus key",
    requires_key: true
  }
];