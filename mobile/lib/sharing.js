import { Share, Platform } from 'react-native';
import { CONFIG } from './config';
import { t } from './i18n';

const DEEP_LINK_SCHEME = CONFIG.DEEP_LINK_SCHEME;

/**
 * Generate a share message and deep link for a missing person alert.
 */
export function buildAlertShareContent(report) {
  const deepLink = `${DEEP_LINK_SCHEME}://alert/${report.id}`;
  const ageInfo = report.age ? ` (${report.age})` : '';
  const locationInfo = report.last_seen_address ? `\n${t('sharing.lastSeen')}: ${report.last_seen_address}` : '';

  const title = t('sharing.missingPerson', { name: report.name });
  const message = [
    `${t('sharing.urgentAlert')}: ${report.name}${ageInfo}`,
    locationInfo,
    report.circumstances ? `\n${report.circumstances}` : '',
    `\n\n${t('sharing.helpFind')}`,
    `${deepLink}`,
    `\n${t('sharing.poweredBy')}`,
  ].filter(Boolean).join('');

  return { title, message, url: deepLink };
}

/**
 * Share a missing person alert via native share sheet.
 */
export async function shareAlert(report) {
  const { title, message, url } = buildAlertShareContent(report);

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message, url }
        : { title, message: `${message}` },
      { dialogTitle: title }
    );
    return result;
  } catch {
    return null;
  }
}

/**
 * Share a lost item report.
 */
export async function shareLostItem(item) {
  const deepLink = `${DEEP_LINK_SCHEME}://item/${item.id}?type=lost`;
  const message = [
    `${t('sharing.lostItem')}: ${item.category}`,
    item.description ? `\n${item.description}` : '',
    item.lost_address ? `\n${t('sharing.lastSeen')}: ${item.lost_address}` : '',
    `\n\n${t('sharing.helpFind')}`,
    `${deepLink}`,
    `\n${t('sharing.poweredBy')}`,
  ].filter(Boolean).join('');

  try {
    return await Share.share(
      Platform.OS === 'ios'
        ? { message, url: deepLink }
        : { title: t('sharing.lostItem'), message },
      { dialogTitle: t('sharing.lostItem') }
    );
  } catch {
    return null;
  }
}

/**
 * Share a found item report.
 */
export async function shareFoundItem(item) {
  const deepLink = `${DEEP_LINK_SCHEME}://item/${item.id}?type=found`;
  const message = [
    `${t('sharing.foundItem')}: ${item.category}`,
    item.description ? `\n${item.description}` : '',
    item.found_address ? `\n${t('sharing.foundAt')}: ${item.found_address}` : '',
    `\n\n${deepLink}`,
    `\n${t('sharing.poweredBy')}`,
  ].filter(Boolean).join('');

  try {
    return await Share.share(
      Platform.OS === 'ios'
        ? { message, url: deepLink }
        : { title: t('sharing.foundItem'), message },
      { dialogTitle: t('sharing.foundItem') }
    );
  } catch {
    return null;
  }
}
