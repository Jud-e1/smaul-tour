import { Injectable } from '@nestjs/common';
import {
  NotificationType,
  NotificationTemplateContext,
  RenderedNotification,
} from './interfaces/notification.interfaces';

/**
 * Template engine for notification content.
 * Renders subject and body for each notification type.
 */
@Injectable()
export class NotificationTemplateService {
  render(context: NotificationTemplateContext): RenderedNotification {
    switch (context.type) {
      case 'booking_confirmed':
        return this.bookingConfirmed(context.data);
      case 'booking_cancelled':
        return this.bookingCancelled(context.data);
      case 'payment_received':
        return this.paymentReceived(context.data);
      case 'itinerary_generated':
        return this.itineraryGenerated(context.data);
      case 'review_received':
        return this.reviewReceived(context.data);
      case 'verification_approved':
        return this.verificationApproved(context.data);
      case 'new_booking':
        return this.newBooking(context.data);
      default:
        return this.generic(context.type, context.data);
    }
  }

  private bookingConfirmed(data: Record<string, any>): RenderedNotification {
    const ref = data.referenceNumber ?? 'N/A';
    const experience = data.experienceName ?? 'your experience';
    const date = data.date ?? 'the scheduled date';
    return {
      subject: `Booking Confirmed – ${experience}`,
      body: `Your booking (ref: ${ref}) for "${experience}" on ${date} has been confirmed. Enjoy your experience!`,
      htmlBody: `<p>Your booking <strong>${ref}</strong> for <em>${experience}</em> on <strong>${date}</strong> has been confirmed.</p><p>Enjoy your experience!</p>`,
    };
  }

  private bookingCancelled(data: Record<string, any>): RenderedNotification {
    const ref = data.referenceNumber ?? 'N/A';
    const experience = data.experienceName ?? 'your experience';
    const refundInfo = data.refundAmount
      ? ` A refund of ${data.refundCurrency ?? ''} ${data.refundAmount} will be processed.`
      : '';
    return {
      subject: `Booking Cancelled – ${experience}`,
      body: `Your booking (ref: ${ref}) for "${experience}" has been cancelled.${refundInfo}`,
      htmlBody: `<p>Your booking <strong>${ref}</strong> for <em>${experience}</em> has been cancelled.</p>${refundInfo ? `<p>${refundInfo}</p>` : ''}`,
    };
  }

  private paymentReceived(data: Record<string, any>): RenderedNotification {
    const amount = data.amount ?? '0';
    const currency = data.currency ?? 'USD';
    const txId = data.transactionId ?? 'N/A';
    return {
      subject: 'Payment Confirmation',
      body: `Your payment of ${currency} ${amount} (transaction ID: ${txId}) has been successfully processed.`,
      htmlBody: `<p>Your payment of <strong>${currency} ${amount}</strong> (transaction ID: <code>${txId}</code>) has been successfully processed.</p>`,
    };
  }

  private itineraryGenerated(data: Record<string, any>): RenderedNotification {
    const link = data.itineraryLink ?? '/itineraries';
    return {
      subject: 'Your Itinerary is Ready!',
      body: `Your personalized travel itinerary has been generated. View it here: ${link}`,
      htmlBody: `<p>Your personalized travel itinerary has been generated.</p><p><a href="${link}">View your itinerary</a></p>`,
    };
  }

  private reviewReceived(data: Record<string, any>): RenderedNotification {
    const experience = data.experienceName ?? 'your experience';
    const rating = data.rating ?? 'N/A';
    return {
      subject: `New Review for ${experience}`,
      body: `You received a ${rating}-star review for "${experience}".`,
      htmlBody: `<p>You received a <strong>${rating}-star</strong> review for <em>${experience}</em>.</p>`,
    };
  }

  private verificationApproved(_data: Record<string, any>): RenderedNotification {
    return {
      subject: 'Guide Verification Approved',
      body: 'Congratulations! Your guide verification has been approved. You can now receive bookings.',
      htmlBody: '<p>Congratulations! Your guide verification has been <strong>approved</strong>. You can now receive bookings.</p>',
    };
  }

  private newBooking(data: Record<string, any>): RenderedNotification {
    const ref = data.referenceNumber ?? 'N/A';
    const experience = data.experienceName ?? 'your experience';
    const date = data.date ?? 'the scheduled date';
    const traveler = data.travelerName ?? 'A traveler';
    return {
      subject: `New Booking – ${experience}`,
      body: `${traveler} has booked "${experience}" on ${date} (ref: ${ref}).`,
      htmlBody: `<p><strong>${traveler}</strong> has booked <em>${experience}</em> on <strong>${date}</strong> (ref: <code>${ref}</code>).</p>`,
    };
  }

  private generic(type: NotificationType, data: Record<string, any>): RenderedNotification {
    return {
      subject: `Notification: ${type}`,
      body: JSON.stringify(data),
    };
  }
}
