import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CurrencyService } from './currency.service';
import { PaymentRequest, RefundRequest } from './interfaces/payment.interfaces';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly currencyService: CurrencyService
  ) {}

  @Get('currencies')
  @ApiOperation({ summary: 'List supported currencies' })
  @ApiResponse({ status: 200, description: 'List of supported currency codes' })
  getSupportedCurrencies() {
    return { currencies: this.currencyService.getSupportedCurrencies() };
  }

  @Post()
  @ApiOperation({ summary: 'Process a payment for a booking' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  processPayment(@Body() request: PaymentRequest) {
    return this.paymentsService.processPayment(request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details returned' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPayment(id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get transaction log for a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Transaction log returned' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  getTransactionLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getTransactionLog(id);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Generate a receipt for a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Receipt generated' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  generateReceipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.generateReceipt(id);
  }

  @Post(':id/escrow')
  @ApiOperation({ summary: 'Place payment funds into escrow' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 201, description: 'Funds placed in escrow' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  escrowFunds(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.escrowFunds(id);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release escrowed funds to the guide' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 201, description: 'Funds released from escrow' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  releaseFunds(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.releaseFunds(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 201, description: 'Refund initiated' })
  @ApiResponse({ status: 400, description: 'Refund not eligible' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  refundPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Omit<RefundRequest, 'paymentId'>
  ) {
    return this.paymentsService.refundPayment({ paymentId: id, ...body });
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a pending payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @ApiResponse({ status: 201, description: 'Payment confirmed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  confirmPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.confirmPayment(id);
  }
}
