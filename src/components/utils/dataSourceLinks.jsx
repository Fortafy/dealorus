/**
 * Generate links to public data sources for nonprofit organizations
 */

export function getDataSourceLinks(data) {
  const links = [];
  
  // ProPublica Nonprofit Explorer (requires EIN)
  if (data.ein) {
    const cleanEIN = data.ein.replace(/[^0-9]/g, '');
    links.push({
      name: 'ProPublica Nonprofit Explorer',
      url: `https://projects.propublica.org/nonprofits/organizations/${cleanEIN}`,
      icon: 'FileText',
      description: 'View Form 990 filings and financial data'
    });
  }
  
  // GuideStar (now Candid) - search by name and state
  if (data.organization_name && data.state) {
    const encodedName = encodeURIComponent(data.organization_name);
    links.push({
      name: 'GuideStar/Candid',
      url: `https://www.guidestar.org/search?q=${encodedName}`,
      icon: 'Building2',
      description: 'Nonprofit profile and ratings'
    });
  }
  
  // IRS Tax Exempt Organization Search
  if (data.ein) {
    const cleanEIN = data.ein.replace(/[^0-9]/g, '');
    links.push({
      name: 'IRS Tax Exempt Search',
      url: `https://apps.irs.gov/app/eos/detailsPage?ein=${cleanEIN}&name=&city=&state=&country=US&deductibility=all&dispatchMethod=searchAll&submitName=Search`,
      icon: 'FileCheck',
      description: 'Official IRS tax-exempt status'
    });
  }
  
  // Charity Navigator (requires name)
  if (data.organization_name) {
    const encodedName = encodeURIComponent(data.organization_name);
    links.push({
      name: 'Charity Navigator',
      url: `https://www.charitynavigator.org/?bay=search.alpha&term=${encodedName}`,
      icon: 'Award',
      description: 'Charity ratings and analysis'
    });
  }
  
  // Organization's own website
  if (data.website) {
    const url = data.website.startsWith('http') ? data.website : `https://${data.website}`;
    links.push({
      name: 'Official Website',
      url: url,
      icon: 'Globe',
      description: 'Visit organization website'
    });
  }
  
  return links;
}