namespace QuanLyDocTruyen.API.Entities;

public enum UserRole { Member, Admin }
public enum UserStatus { Active, Restricted, Suspended }
public enum StoryStatus { Ongoing, Completed }
public enum AccessType { Free, Paid, Mixed }


public enum PackageScope { All, Selected }
public enum TransactionType { Package, Story }
public enum TransactionStatus { Pending, Success, Failed }